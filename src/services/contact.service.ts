import { CreateContactDataDto } from '@src/dtos/contact.dto';
import {
    createContact,
    getContactById,
    getContacts,
    deleteContact,
    countContacts,
    updateContact,
} from '@src/daos/contact.dao';
import { CustomError, ErrorType } from '@src/core/Error';
import { PaginationQuery } from '@src/types/common/api.types';
import prisma from '@src/config/prisma';
import notificationService from './notification.service';

const submitContact = async (data: CreateContactDataDto, userId?: string) => {
    try {
        const contactData = {
            ...data,
            ...(userId ? { userId } : {}),
        };
        const contact = await createContact(contactData);

        const adminUsers = await prisma.user.findMany({
            where: {
                role: {
                    name: 'admin',
                },
            },
            select: {
                id: true,
            },
        });

        await Promise.all(
            adminUsers.map((admin) =>
                notificationService.createAndEmit(
                    {
                        userId: admin.id,
                        title: 'Liên hệ mới',
                        content: `${data.fullname} đã gửi tin nhắn: "${data.subject || data.content.substring(0, 50)}..."`,
                        type: 'contact',
                    },
                    'contact:new'
                )
            )
        );

        // TODO: Send notification email to admin (optional)
        const { id, isRead, ...others } = contact;
        return others;
    } catch (error: any) {
        throw new CustomError(
            ErrorType.INTERNAL_ERROR,
            'Unable to send the contact message. Please try again later.'
        );
    }
};

const getContactDetails = async (contactId: string) => {
    const contact = await getContactById(contactId);
    if (!contact) {
        throw new CustomError(
            ErrorType.NOT_FOUND,
            'Contact message not found.'
        );
    }
    return contact;
};

const getAllContacts = async (options: {
    pagination: PaginationQuery;
    isRead?: boolean;
    userId?: string;
}) => {
    return await getContacts(options);
};

const markAsRead = async (contactId: string) => {
    const contact = await getContactById(contactId);
    if (!contact) {
        throw new CustomError(
            ErrorType.NOT_FOUND,
            'Contact message not found.'
        );
    }

    return await updateContact(contactId, { isRead: true });
};

const markAsUnread = async (contactId: string) => {
    const contact = await getContactById(contactId);
    if (!contact) {
        throw new CustomError(
            ErrorType.NOT_FOUND,
            'Contact message not found.'
        );
    }

    return await updateContact(contactId, { isRead: false });
};

const removeContact = async (contactId: string) => {
    const contact = await getContactById(contactId);
    if (!contact) {
        throw new CustomError(
            ErrorType.NOT_FOUND,
            'Contact message not found.'
        );
    }

    return await deleteContact(contactId);
};

const getContactStatistics = async () => {
    const [total, unread, read] = await Promise.all([
        countContacts({}),
        countContacts({ isRead: false }),
        countContacts({ isRead: true }),
    ]);

    return {
        total,
        unread,
        read,
        readPercentage: total > 0 ? Math.round((read / total) * 100) : 0,
    };
};

const replyToContact = async (
    userId: string,
    contactId: string,
    message: string
) => {
    const contact = await getContactById(contactId);
    if (!contact) {
        throw new CustomError(ErrorType.NOT_FOUND, 'Contact not found.');
    }

    const updatedContact = await updateContact(contactId, {
        reply: message,
        isRead: true,
        replyAt: new Date(),
        userIdReply: userId,
    });

    // Thêm notification
    if (contact.userId) {
        await notificationService.createAndEmit(
            {
                userId: contact.userId,
                title: 'Phản hồi từ hỗ trợ',
                content: `Tin nhắn của bạn đã được phản hồi: "${message.substring(0, 50)}..."`,
                type: 'contact_reply',
            },
            'contact:reply'
        );
    }
    return updatedContact;
};

export default {
    submitContact,
    getContactDetails,
    getAllContacts,
    markAsRead,
    markAsUnread,
    removeContact,
    getContactStatistics,
    replyToContact,
};
