import contactService from '@src/services/contact.service';
import {
    createContact,
    getContactById,
    getContacts,
    deleteContact,
    countContacts,
    updateContact,
} from '@src/daos/contact.dao';
import { CustomError, ErrorType } from '@src/core/Error';
import notificationService from '@src/services/notification.service';
import prisma from '@src/config/prisma';

// ---------------------------------------------------------------------------
// Mock tất cả phụ thuộc ngoài để test thuần service logic
// ---------------------------------------------------------------------------
jest.mock('@src/daos/contact.dao');
jest.mock('@src/services/notification.service', () => ({
    __esModule: true,
    default: { createAndEmit: jest.fn() },
}));
jest.mock('@src/config/prisma', () => ({
    __esModule: true,
    default: {
        user: { findMany: jest.fn() },
    },
}));

// ---------------------------------------------------------------------------
// Hằng số dùng chung
// ---------------------------------------------------------------------------
const CONTACT_ID = 'contact-uuid-001';
const USER_ID    = 'user-uuid-001';
const ADMIN_ID   = 'admin-uuid-001';

const mockContact = {
    id: CONTACT_ID,
    fullname: 'Nguyen Van A',
    email: 'test@example.com',
    phone: '0901234567',
    subject: 'Hỏi thăm',
    content: 'Tôi muốn hỏi về dịch vụ của bạn.',
    isRead: false,
    userId: USER_ID,
    reply: null,
    replyAt: null,
    userIdReply: null,
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
};

const mockContactNoUser = { ...mockContact, userId: null };

const defaultPagination = {
    page: '1',
    limit: '10',
    sortBy: 'createdAt',
    sortOrder: 'asc' as const,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const mockedCreateContact     = createContact     as jest.MockedFunction<typeof createContact>;
const mockedGetContactById    = getContactById    as jest.MockedFunction<typeof getContactById>;
const mockedGetContacts       = getContacts       as jest.MockedFunction<typeof getContacts>;
const mockedDeleteContact     = deleteContact     as jest.MockedFunction<typeof deleteContact>;
const mockedCountContacts     = countContacts     as jest.MockedFunction<typeof countContacts>;
const mockedUpdateContact     = updateContact     as jest.MockedFunction<typeof updateContact>;
const mockedPrismaUserFindMany = (prisma.user.findMany as jest.Mock);
const mockedNotifCreateAndEmit = (notificationService.createAndEmit as jest.Mock);

// ---------------------------------------------------------------------------
// Test Suites
// ---------------------------------------------------------------------------
describe('contactService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    // =========================================================================
    // 1. submitContact
    // =========================================================================
    describe('submitContact', () => {
        const contactData = {
            fullname: 'Nguyen Van A',
            email: 'test@example.com',
            phone: '0901234567',
            subject: 'Hỏi thăm',
            content: 'Tôi muốn hỏi về dịch vụ của bạn.',
        };

        it('nên tạo contact thành công với userId và gửi notification tới admin', async () => {
            mockedCreateContact.mockResolvedValue(mockContact as any);
            mockedPrismaUserFindMany.mockResolvedValue([{ id: ADMIN_ID }]);
            mockedNotifCreateAndEmit.mockResolvedValue({} as any);

            const result = await contactService.submitContact(contactData, USER_ID);

            // Kiểm tra createContact nhận đúng payload (kèm userId)
            expect(mockedCreateContact).toHaveBeenCalledWith({ ...contactData, userId: USER_ID });

            // Kiểm tra tìm admin
            expect(mockedPrismaUserFindMany).toHaveBeenCalledWith(
                expect.objectContaining({ where: { role: { name: 'admin' } } })
            );

            // Kiểm tra gửi notification tới admin
            expect(mockedNotifCreateAndEmit).toHaveBeenCalledTimes(1);
            expect(mockedNotifCreateAndEmit).toHaveBeenCalledWith(
                expect.objectContaining({ userId: ADMIN_ID, type: 'contact' }),
                'contact:new'
            );

            // Kết quả không được chứa id và isRead
            expect(result).not.toHaveProperty('id');
            expect(result).not.toHaveProperty('isRead');
            expect(result).toHaveProperty('fullname', contactData.fullname);
        });

        it('nên tạo contact thành công khi KHÔNG có userId (khách vãng lai)', async () => {
            mockedCreateContact.mockResolvedValue(mockContact as any);
            mockedPrismaUserFindMany.mockResolvedValue([]);
            mockedNotifCreateAndEmit.mockResolvedValue({} as any);

            const result = await contactService.submitContact(contactData);

            // Không được truyền userId vào DAO
            expect(mockedCreateContact).toHaveBeenCalledWith(contactData);
            expect(result).toHaveProperty('fullname', contactData.fullname);
        });

        it('nên gửi notification tới nhiều admin', async () => {
            mockedCreateContact.mockResolvedValue(mockContact as any);
            mockedPrismaUserFindMany.mockResolvedValue([{ id: 'admin-1' }, { id: 'admin-2' }]);
            mockedNotifCreateAndEmit.mockResolvedValue({} as any);

            await contactService.submitContact(contactData, USER_ID);

            expect(mockedNotifCreateAndEmit).toHaveBeenCalledTimes(2);
        });

        it('nên dùng subject trong nội dung notification khi subject tồn tại', async () => {
            mockedCreateContact.mockResolvedValue(mockContact as any);
            mockedPrismaUserFindMany.mockResolvedValue([{ id: ADMIN_ID }]);
            mockedNotifCreateAndEmit.mockResolvedValue({} as any);

            await contactService.submitContact(contactData, USER_ID);

            const callArgs = mockedNotifCreateAndEmit.mock.calls[0][0];
            expect(callArgs.content).toContain(contactData.subject);
        });

        it('nên dùng 50 ký tự đầu của content khi không có subject', async () => {
            const dataNoSubject = { ...contactData, subject: undefined };
            mockedCreateContact.mockResolvedValue({ ...mockContact, subject: null } as any);
            mockedPrismaUserFindMany.mockResolvedValue([{ id: ADMIN_ID }]);
            mockedNotifCreateAndEmit.mockResolvedValue({} as any);

            await contactService.submitContact(dataNoSubject, USER_ID);

            const callArgs = mockedNotifCreateAndEmit.mock.calls[0][0];
            expect(callArgs.content).toContain(contactData.content.substring(0, 50));
        });

        it('nên ném CustomError INTERNAL_ERROR khi createContact thất bại', async () => {
            mockedCreateContact.mockRejectedValue(new Error('DB error'));

            await expect(contactService.submitContact(contactData, USER_ID))
                .rejects.toMatchObject({
                    type: ErrorType.INTERNAL_ERROR,
                });
        });
    });

    // =========================================================================
    // 2. getContactDetails
    // =========================================================================
    describe('getContactDetails', () => {
        it('nên trả về contact khi tìm thấy', async () => {
            mockedGetContactById.mockResolvedValue(mockContact as any);

            const result = await contactService.getContactDetails(CONTACT_ID);

            expect(mockedGetContactById).toHaveBeenCalledWith(CONTACT_ID);
            expect(result).toEqual(mockContact);
        });

        it('nên ném CustomError NOT_FOUND khi contact không tồn tại', async () => {
            mockedGetContactById.mockResolvedValue(null);

            await expect(contactService.getContactDetails(CONTACT_ID))
                .rejects.toMatchObject({
                    type: ErrorType.NOT_FOUND,
                    message: 'Contact message not found.',
                });
        });
    });

    // =========================================================================
    // 3. getAllContacts
    // =========================================================================
    describe('getAllContacts', () => {
        it('nên trả về danh sách contact theo options đầy đủ', async () => {
            const mockList = { data: [mockContact], total: 1 };
            mockedGetContacts.mockResolvedValue(mockList as any);

            const result = await contactService.getAllContacts({
                pagination: defaultPagination,
                isRead: false,
                userId: USER_ID,
            });

            expect(mockedGetContacts).toHaveBeenCalledWith({
                pagination: defaultPagination,
                isRead: false,
                userId: USER_ID,
            });
            expect(result).toEqual(mockList);
        });

        it('nên gọi getContacts chỉ với pagination khi không có filter', async () => {
            const mockList = { data: [], total: 0 };
            mockedGetContacts.mockResolvedValue(mockList as any);

            await contactService.getAllContacts({ pagination: defaultPagination });

            expect(mockedGetContacts).toHaveBeenCalledWith({ pagination: defaultPagination });
        });
    });

    // =========================================================================
    // 4. markAsRead  (thay đổi dữ liệu – có rollback)
    // =========================================================================
    describe('markAsRead', () => {
        // Lưu trạng thái trước khi test để rollback
        let originalIsRead: boolean;

        beforeEach(() => {
            originalIsRead = mockContact.isRead;
        });

        afterEach(() => {
            // Rollback: khôi phục trạng thái mock về giá trị ban đầu
            mockContact.isRead = originalIsRead;
            jest.clearAllMocks();
        });

        it('nên đánh dấu contact là đã đọc thành công', async () => {
            const updatedContact = { ...mockContact, isRead: true };
            mockedGetContactById.mockResolvedValue(mockContact as any);
            mockedUpdateContact.mockResolvedValue(updatedContact as any);

            const result = await contactService.markAsRead(CONTACT_ID);

            expect(mockedGetContactById).toHaveBeenCalledWith(CONTACT_ID);
            expect(mockedUpdateContact).toHaveBeenCalledWith(CONTACT_ID, { isRead: true });
            expect(result).toEqual(updatedContact);

            // Rollback: đảm bảo mock state được restore sau test
            mockContact.isRead = originalIsRead;
        });

        it('nên ném CustomError NOT_FOUND khi contact không tồn tại', async () => {
            mockedGetContactById.mockResolvedValue(null);

            await expect(contactService.markAsRead('non-existent-id'))
                .rejects.toMatchObject({
                    type: ErrorType.NOT_FOUND,
                    message: 'Contact message not found.',
                });

            // updateContact không được gọi (không có thay đổi DB)
            expect(mockedUpdateContact).not.toHaveBeenCalled();
        });
    });

    // =========================================================================
    // 5. markAsUnread  (thay đổi dữ liệu – có rollback)
    // =========================================================================
    describe('markAsUnread', () => {
        let originalIsRead: boolean;

        beforeEach(() => {
            originalIsRead = true; // giả sử contact ban đầu đã đọc
        });

        afterEach(() => {
            // Rollback mock state
            jest.clearAllMocks();
        });

        it('nên đánh dấu contact là chưa đọc thành công', async () => {
            const readContact   = { ...mockContact, isRead: true };
            const updatedContact = { ...mockContact, isRead: false };
            mockedGetContactById.mockResolvedValue(readContact as any);
            mockedUpdateContact.mockResolvedValue(updatedContact as any);

            const result = await contactService.markAsUnread(CONTACT_ID);

            expect(mockedGetContactById).toHaveBeenCalledWith(CONTACT_ID);
            expect(mockedUpdateContact).toHaveBeenCalledWith(CONTACT_ID, { isRead: false });
            expect(result).toEqual(updatedContact);
        });

        it('nên ném CustomError NOT_FOUND khi contact không tồn tại', async () => {
            mockedGetContactById.mockResolvedValue(null);

            await expect(contactService.markAsUnread('non-existent-id'))
                .rejects.toMatchObject({
                    type: ErrorType.NOT_FOUND,
                    message: 'Contact message not found.',
                });

            expect(mockedUpdateContact).not.toHaveBeenCalled();
        });
    });

    // =========================================================================
    // 6. removeContact  (xóa dữ liệu – có rollback)
    // =========================================================================
    describe('removeContact', () => {
        // Theo dõi contact "đã xóa" để rollback
        let deletedContactId: string | null = null;

        afterEach(() => {
            // Rollback: nếu test xóa dữ liệu thật, cần restore.
            // Trong môi trường mock, chỉ cần clear mock state.
            deletedContactId = null;
            jest.clearAllMocks();
        });

        it('nên xóa contact thành công', async () => {
            mockedGetContactById.mockResolvedValue(mockContact as any);
            mockedDeleteContact.mockImplementation(async (id) => {
                deletedContactId = id; // ghi nhận để rollback nếu cần
                return mockContact as any;
            });

            const result = await contactService.removeContact(CONTACT_ID);

            expect(mockedGetContactById).toHaveBeenCalledWith(CONTACT_ID);
            expect(mockedDeleteContact).toHaveBeenCalledWith(CONTACT_ID);
            expect(result).toEqual(mockContact);

            // Rollback: ghi nhận id đã bị xóa (trong test thật cần restore record)
            expect(deletedContactId).toBe(CONTACT_ID);
        });

        it('nên ném CustomError NOT_FOUND khi contact không tồn tại', async () => {
            mockedGetContactById.mockResolvedValue(null);

            await expect(contactService.removeContact('non-existent-id'))
                .rejects.toMatchObject({
                    type: ErrorType.NOT_FOUND,
                    message: 'Contact message not found.',
                });

            // deleteContact không được gọi – không có thay đổi DB
            expect(mockedDeleteContact).not.toHaveBeenCalled();
        });
    });

    // =========================================================================
    // 7. getContactStatistics
    // =========================================================================
    describe('getContactStatistics', () => {
        it('nên tính toán thống kê đúng khi có dữ liệu', async () => {
            mockedCountContacts
                .mockResolvedValueOnce(10)  // total
                .mockResolvedValueOnce(3)   // unread (isRead: false)
                .mockResolvedValueOnce(7);  // read   (isRead: true)

            const result = await contactService.getContactStatistics();

            expect(mockedCountContacts).toHaveBeenCalledTimes(3);
            expect(mockedCountContacts).toHaveBeenNthCalledWith(1, {});
            expect(mockedCountContacts).toHaveBeenNthCalledWith(2, { isRead: false });
            expect(mockedCountContacts).toHaveBeenNthCalledWith(3, { isRead: true });

            expect(result).toEqual({
                total: 10,
                unread: 3,
                read: 7,
                readPercentage: 70,
            });
        });

        it('nên trả về readPercentage = 0 khi total = 0', async () => {
            mockedCountContacts
                .mockResolvedValueOnce(0)
                .mockResolvedValueOnce(0)
                .mockResolvedValueOnce(0);

            const result = await contactService.getContactStatistics();

            expect(result).toEqual({
                total: 0,
                unread: 0,
                read: 0,
                readPercentage: 0,
            });
        });

        it('nên làm tròn readPercentage về số nguyên', async () => {
            mockedCountContacts
                .mockResolvedValueOnce(3)
                .mockResolvedValueOnce(2)
                .mockResolvedValueOnce(1);

            const result = await contactService.getContactStatistics();

            // 1/3 * 100 = 33.33... → làm tròn = 33
            expect(result.readPercentage).toBe(33);
        });
    });

    // =========================================================================
    // 8. replyToContact  (thay đổi dữ liệu – có rollback)
    // =========================================================================
    describe('replyToContact', () => {
        const replyMessage = 'Cảm ơn bạn đã liên hệ. Chúng tôi sẽ hỗ trợ sớm nhất có thể.';

        // Snapshot trạng thái trước khi update để rollback
        let snapshotBeforeReply: typeof mockContact;

        beforeEach(() => {
            snapshotBeforeReply = { ...mockContact };
        });

        afterEach(() => {
            // Rollback: restore mock về trạng thái ban đầu
            Object.assign(mockContact, snapshotBeforeReply);
            jest.clearAllMocks();
        });

        it('nên cập nhật reply và gửi notification khi contact có userId', async () => {
            const updatedContact = {
                ...mockContact,
                reply: replyMessage,
                isRead: true,
                replyAt: expect.any(Date),
                userIdReply: USER_ID,
            };
            mockedGetContactById.mockResolvedValue(mockContact as any);
            mockedUpdateContact.mockResolvedValue(updatedContact as any);
            mockedNotifCreateAndEmit.mockResolvedValue({} as any);

            const result = await contactService.replyToContact(USER_ID, CONTACT_ID, replyMessage);

            expect(mockedGetContactById).toHaveBeenCalledWith(CONTACT_ID);
            expect(mockedUpdateContact).toHaveBeenCalledWith(
                CONTACT_ID,
                expect.objectContaining({
                    reply: replyMessage,
                    isRead: true,
                    userIdReply: USER_ID,
                })
            );

            // Notification gửi tới userId của contact
            expect(mockedNotifCreateAndEmit).toHaveBeenCalledWith(
                expect.objectContaining({
                    userId: mockContact.userId,
                    type: 'contact_reply',
                }),
                'contact:reply'
            );

            expect(result).toEqual(updatedContact);

            // Rollback: restore snapshot
            Object.assign(mockContact, snapshotBeforeReply);
        });

        it('nên cập nhật reply nhưng KHÔNG gửi notification khi contact không có userId', async () => {
            const updatedContact = {
                ...mockContactNoUser,
                reply: replyMessage,
                isRead: true,
                replyAt: new Date(),
                userIdReply: USER_ID,
            };
            mockedGetContactById.mockResolvedValue(mockContactNoUser as any);
            mockedUpdateContact.mockResolvedValue(updatedContact as any);

            const result = await contactService.replyToContact(USER_ID, CONTACT_ID, replyMessage);

            expect(mockedUpdateContact).toHaveBeenCalled();
            // Không gửi notification vì không có userId
            expect(mockedNotifCreateAndEmit).not.toHaveBeenCalled();
            expect(result).toEqual(updatedContact);
        });

        it('nên ném CustomError NOT_FOUND khi contact không tồn tại', async () => {
            mockedGetContactById.mockResolvedValue(null);

            await expect(
                contactService.replyToContact(USER_ID, 'non-existent-id', replyMessage)
            ).rejects.toMatchObject({
                type: ErrorType.NOT_FOUND,
                message: 'Contact not found.',
            });

            // Không có thay đổi DB
            expect(mockedUpdateContact).not.toHaveBeenCalled();
            expect(mockedNotifCreateAndEmit).not.toHaveBeenCalled();
        });

        it('nên cắt message tối đa 50 ký tự trong nội dung notification', async () => {
            const longMessage = 'A'.repeat(100);
            mockedGetContactById.mockResolvedValue(mockContact as any);
            mockedUpdateContact.mockResolvedValue({ ...mockContact, reply: longMessage } as any);
            mockedNotifCreateAndEmit.mockResolvedValue({} as any);

            await contactService.replyToContact(USER_ID, CONTACT_ID, longMessage);

            const notifPayload = mockedNotifCreateAndEmit.mock.calls[0][0];
            // Content phải chứa 50 ký tự đầu của message
            expect(notifPayload.content).toContain(longMessage.substring(0, 50));
        });
    });
});
