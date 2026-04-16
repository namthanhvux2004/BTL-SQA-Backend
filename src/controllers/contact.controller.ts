import { Request, Response } from 'express';
import { SuccessResponse } from '@src/core/ApiResponse';
import { CreateContactDataDto } from '@src/dtos/contact.dto';
import contactService from '@src/services/contact.service';
import { PaginationQuery } from '@src/types/common/api.types';

const submitContact = async (req: Request, res: Response) => {
    const body = req.body as CreateContactDataDto;
    const user = req.user;
    const contactData = { ...body };
    let userId: string | undefined;

    if (user) {
        userId = user.id;
        if (!body.email && user.email) {
            contactData.email = user.email;
        }
    }

    const result = await contactService.submitContact(contactData, userId);

    const message = user
        ? `Thank you, ${user.username}! We’ve received your message and will respond as soon as possible.`
        : 'Thank you for your feedback! We’ll reply to your email as soon as possible.';

    return new SuccessResponse(result, message).send(res);
};

const getContacts = async (req: Request, res: Response) => {
    const pagination: PaginationQuery = {
        page: req.query.page as string,
        limit: req.query.limit as string,
        sortBy: req.query.sortBy as string,
        sortOrder: req.query.sortOrder as 'asc' | 'desc',
        search: req.query.search as string,
    };

    const isRead =
        req.query.isRead === 'true'
            ? true
            : req.query.isRead === 'false'
              ? false
              : undefined;
    const userId = req.query.userId as string;

    const result = await contactService.getAllContacts({
        pagination,
        ...(isRead !== undefined && { isRead }),
        userId,
    });

    return new SuccessResponse(
        result.data,
        'Contact list loaded successfully',
        result.metadata
    ).send(res);
};

const getContactById = async (req: Request<{ id: string }>, res: Response) => {
    const { id } = req.params;
    const result = await contactService.getContactDetails(id);

    return new SuccessResponse(
        result,
        'Contact details loaded successfully'
    ).send(res);
};

const getMyContacts = async (req: Request, res: Response) => {
    const user = req.user!; // Guaranteed to exist after authentication

    const pagination: PaginationQuery = {
        page: req.query.page as string,
        limit: req.query.limit as string,
        sortBy: req.query.sortBy as string,
        sortOrder: req.query.sortOrder as 'asc' | 'desc',
    };

    const isRead =
        req.query.isRead === 'true'
            ? true
            : req.query.isRead === 'false'
              ? false
              : undefined;

    const result = await contactService.getAllContacts({
        pagination,
        ...(isRead !== undefined && { isRead }),
        userId: user.id, // Filter by current user
    });

    return new SuccessResponse(
        result.data,
        'Your contact messages loaded successfully',
        result.metadata
    ).send(res);
};

const replyContact = async (
    req: Request<{ id: string }, { message: string }>,
    res: Response
) => {
    const user = req.user!;
    const { id } = req.params;
    const { message } = req.body;
    const result = await contactService.replyToContact(user.id, id, message);

    return new SuccessResponse(result, 'Message replied successfully').send(
        res
    );
};

const deleteContact = async (req: Request<{ id: string }>, res: Response) => {
    const { id } = req.params;
    await contactService.removeContact(id);

    return new SuccessResponse(null, 'Message deleted successfully').send(res);
};

const getContactStatistics = async (req: Request, res: Response) => {
    const result = await contactService.getContactStatistics();

    return new SuccessResponse(
        result,
        'Contact message statistics loaded successfully'
    ).send(res);
};

export default {
    submitContact,
    getContacts,
    getContactById,
    getMyContacts,
    replyContact,
    deleteContact,
    getContactStatistics,
};
