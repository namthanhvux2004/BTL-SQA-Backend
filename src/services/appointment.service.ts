import appointmentDao from '@src/daos/appointment.dao';
import doctorDao from '@src/daos/doctor.dao';
import { splitScheduleToSlots } from '@src/helpers/slot.helper';
import { canModifyAppointment } from '@src/helpers/business-rules.helper';
import prisma from '@src/config/prisma';
import {
    GetAvailableSlotsQuerySchema,
    GetAppointmentsQuerySchema,
    CreateAppointmentSchema,
    UpdateAppointmentSchema,
    CancelAppointmentSchema,
    RejectAppointmentSchema,
    ApproveAppointmentSchema,
    type AvailableSlotsResponseDto,
    type AvailableSlotDto,
    type AppointmentsListResponseDto,
    type AppointmentResponseDto,
} from '@src/dtos/appointment.dto';
import { ValidationError, CustomError, ErrorType } from '@src/core/Error';
import doctorServiceDao from '@src/daos/doctor-service.dao';
import notificationService from './notification.service';
import { endOfDayISO, startOfDayISO } from '@src/helpers/datetime';

const APPOINTMENT_EVENTS = {
    NEW: 'appointment:new',
    CONFIRMED: 'appointment:confirmed',
    CANCELLED: 'appointment:cancelled',
    UPDATED: 'appointment:updated',
    REMINDER: 'appointment:reminder',
    REJECTED: 'appointment:rejected',
};

const DEFAULT_SLOT_DURATION = 30; // minutes
const DEFAULT_MAX_SLOT = 1;

/**
 * Validate query/data và throw error nếu invalid
 * @param schema - Zod schema để validate
 * @param data - Dữ liệu cần validate
 * @param errorMessage - Message khi validation fail
 * @returns Validated data
 */
function validateOrThrow<T = any>(
    schema: any,
    data: any,
    errorMessage: string
): T {
    const result = schema.safeParse(data);
    if (!result.success) {
        throw new ValidationError(
            result.error.issues.map((issue: any) => ({
                field: issue.path.join('.') || 'data',
                message: issue.message,
            })),
            errorMessage
        );
    }
    return result.data;
}

function formatDoctorName(doctor: any): string {
    const firstName = doctor?.staff?.user?.name?.firstName || '';
    const lastName = doctor?.staff?.user?.name?.lastName || '';
    return `${firstName} ${lastName}`.trim() || 'N/A';
}

function formatAppointmentResponse(appointment: any): AppointmentResponseDto {
    const patientFirstName = appointment?.patient?.user?.name?.firstName || '';
    const patientLastName = appointment?.patient?.user?.name?.lastName || '';
    const patientName = `${patientFirstName} ${patientLastName}`.trim();

    const doctorFirstName =
        appointment?.doctor?.staff?.user?.name?.firstName || '';
    const doctorLastName =
        appointment?.doctor?.staff?.user?.name?.lastName || '';
    const doctorName = `${doctorFirstName} ${doctorLastName}`.trim();

    const bookedByFirstName = appointment?.bookedBy?.name?.firstName || '';
    const bookedByLastName = appointment?.bookedBy?.name?.lastName || '';
    const bookedByName = `${bookedByFirstName} ${bookedByLastName}`.trim();

    return {
        id: appointment.id,
        patient: {
            id: appointment.patient.userId,
            name: patientName || 'N/A',
            email: appointment.patient.user.email,
            phone: appointment.patient.user.phone,
            avatar: appointment.patient.user.avatar,
            patientId: appointment.patient.patientId,
        },
        doctor: {
            id: appointment.doctor.userId,
            name: doctorName || 'N/A',
            specialization: appointment.doctor.specialization,
            level: appointment.doctor.level,
            avatar: appointment.doctor.staff?.user?.avatar || null,
        },
        medicalService: appointment.medicalService
            ? {
                  id: appointment.medicalService.id,
                  name: appointment.medicalService.name,
                  durationMinutes: appointment.medicalService.durationMinutes,
                  price: appointment.medicalService.price,
              }
            : null,
        department: appointment.medicalService?.department
            ? {
                  id: appointment.medicalService.department.id,
                  name: appointment.medicalService.department.name,
              }
            : null,
        schedule: appointment.schedule
            ? {
                  id: appointment.schedule.id,
                  room: appointment.schedule.room.name,
                  department: appointment.schedule.department.name,
              }
            : null,
        type: appointment.type,
        startTime: appointment.startTime,
        endTime: appointment.endTime,
        reason: appointment.reason,
        reasonCancel: appointment.reasonCancel,
        notes: appointment.notes,
        status: appointment.status,
        createdAt: appointment.createdAt,
        updatedAt: appointment.updatedAt,
        bookedBy: appointment.bookedBy
            ? {
                  id: appointment.bookedBy.id,
                  name: bookedByName || 'N/A',
              }
            : null,
    };
}

/**
 * Process slots for a schedule - Extract để tái sử dụng
 * Chỉ trả về các slots thuộc ngày cụ thể (date)
 * Logic: maxSlot là số lượng appointment tối đa trong CẢ CA LÀM VIỆC
 * Nếu đã đạt maxSlot thì không còn slot nào available
 * Các slot đã có người đặt sẽ bị loại bỏ
 */
async function processScheduleSlots(
    schedule: any,
    slotDuration: number,
    date: Date,
    timezone: string
): Promise<AvailableSlotDto[]> {
    const minutesPerSlot = slotDuration || DEFAULT_SLOT_DURATION;

    // Tính startOfDay và endOfDay cho ngày được yêu cầu
    const startOfDay = startOfDayISO(date, timezone);
    const endOfDay = endOfDayISO(date, timezone);

    // Giới hạn schedule.startTime và schedule.endTime trong khoảng ngày được yêu cầu
    const effectiveStartTime = new Date(
        new Date(schedule.startTime).getTime() > new Date(startOfDay!).getTime()
            ? schedule.startTime
            : startOfDay
    );
    const effectiveEndTime = new Date(
        new Date(schedule.endTime).getTime() < new Date(endOfDay!).getTime()
            ? schedule.endTime
            : endOfDay
    );

    // Nếu schedule không giao với ngày được yêu cầu, return empty
    if (effectiveStartTime >= effectiveEndTime) {
        return [];
    }

    const maxSlot = schedule.maxSlot || DEFAULT_MAX_SLOT;

    // 1. Đếm tổng số appointments đã đặt trong CẢ schedule
    const totalBookedAppointments =
        await appointmentDao.countAppointmentsInSchedule(schedule.id);

    // 2. Nếu đã đạt maxSlot, không còn slot nào available
    if (totalBookedAppointments >= maxSlot) {
        return [];
    }

    // 3. Lấy danh sách các thời gian đã được đặt
    const bookedTimes = await appointmentDao.getBookedTimesInSchedule(
        schedule.id
    );
    const bookedTimesSet = new Set(bookedTimes.map((time) => time.getTime()));

    // 4. Split thành các slots
    const slots = splitScheduleToSlots(
        effectiveStartTime,
        effectiveEndTime,
        minutesPerSlot
    );

    // 5. Lọc ra các slot chưa có người đặt
    const availableSlots: AvailableSlotDto[] = [];
    const remainingSlots = maxSlot - totalBookedAppointments;

    for (const slot of slots) {
        // Kiểm tra xem slot này đã có người đặt chưa
        if (!bookedTimesSet.has(slot.start.getTime())) {
            availableSlots.push({
                start: slot.start,
                end: slot.end,
                scheduleId: schedule.id,
                roomId: schedule.room.id,
                roomName: schedule.room.name,
                departmentId: schedule.department.id,
                departmentName: schedule.department.name,
                availableCount: remainingSlots, // Số lượt khám còn lại trong ca
                maxSlot,
            });
        }
    }

    return availableSlots;
}

/**
 * Validate time range
 */
function validateTimeRange(startTime: Date, endTime: Date | null): void {
    const effectiveEndTime =
        endTime ||
        new Date(startTime.getTime() + DEFAULT_SLOT_DURATION * 60000);

    if (startTime >= effectiveEndTime) {
        throw new ValidationError(
            [
                {
                    field: 'startTime',
                    message:
                        'Thời gian bắt đầu phải nhỏ hơn thời gian kết thúc',
                },
            ],
            'Thời gian không hợp lệ'
        );
    }
}

/**
 * Lấy danh sách slots khả dụng cho một bác sĩ trong ngày
 */
const getAvailableSlots = async (
    query: any,
    timezone?: string
): Promise<AvailableSlotsResponseDto> => {
    // Fallback timezone if not provided
    const tz = timezone || 'UTC';

    // Validate input parameters using helper
    const { doctorId, date, departmentId, medicalServiceId, slotDuration } =
        validateOrThrow(
            GetAvailableSlotsQuerySchema,
            query,
            'Tham số truy vấn không hợp lệ'
        );

    try {
        // 1. Kiểm tra xem bác sĩ có tồn tại không
        const doctor = await doctorDao.getDoctorById(doctorId);
        if (!doctor) {
            throw new CustomError(
                ErrorType.NOT_FOUND,
                `Không tìm thấy bác sĩ với ID "${doctorId}"`
            );
        }

        // 2. Nếu có medicalServiceId, lấy thông tin DoctorService và validate
        let effectiveSlotDuration = slotDuration || DEFAULT_SLOT_DURATION;
        let medicalServiceInfo: {
            id: string;
            name: string;
            durationMinutes: number;
            price: number;
        } | null = null;

        if (medicalServiceId) {
            const doctorService = await doctorServiceDao.getDoctorService(
                doctorId,
                medicalServiceId
            );

            if (!doctorService) {
                throw new CustomError(
                    ErrorType.NOT_FOUND,
                    `Bác sĩ không cung cấp dịch vụ với ID "${medicalServiceId}"`
                );
            }

            if (
                !doctorService.isActive ||
                !doctorService.medicalService.isActive
            ) {
                throw new CustomError(
                    ErrorType.BAD_REQUEST,
                    'Dịch vụ này hiện không khả dụng'
                );
            }

            // Sử dụng durationMinutes của DoctorService (ưu tiên) hoặc MedicalService
            effectiveSlotDuration =
                doctorService.durationMinutes ||
                doctorService.medicalService.durationMinutes;

            medicalServiceInfo = {
                id: doctorService.medicalService.id,
                name: doctorService.medicalService.name,
                durationMinutes: effectiveSlotDuration,
                price: doctorService.price,
            };
        }

        // 3. Lấy danh sách schedules của bác sĩ trong ngày
        const schedules = await appointmentDao.getDoctorSchedulesByDate(
            doctorId,
            date,
            tz,
            departmentId
        );

        if (schedules.length === 0) {
            return {
                date,
                doctorId,
                doctorName: formatDoctorName(doctor),
                medicalService: medicalServiceInfo,
                slots: [],
                totalSlots: 0,
            };
        }

        // 4. Process slots cho tất cả schedules (parallel processing)
        // Truyền thêm date và timezone để chỉ lấy slots trong ngày được yêu cầu
        const slotArrays = await Promise.all(
            schedules.map((schedule) =>
                processScheduleSlots(schedule, effectiveSlotDuration, date, tz)
            )
        );

        // Flatten và sort
        const availableSlots = slotArrays
            .flat()
            .sort((a, b) => a.start.getTime() - b.start.getTime());

        return {
            date,
            doctorId,
            doctorName: formatDoctorName(doctor),
            medicalService: medicalServiceInfo,
            slots: availableSlots,
            totalSlots: availableSlots.length,
        };
    } catch (error) {
        if (error instanceof ValidationError || error instanceof CustomError) {
            throw error;
        }
        throw new CustomError(
            ErrorType.INTERNAL_ERROR,
            'Có lỗi xảy ra khi lấy danh sách slots khả dụng. Vui lòng thử lại sau.'
        );
    }
};

/**
 * Lấy danh sách appointments với filter và phân trang
 */
const getAppointments = async (
    query: any
): Promise<AppointmentsListResponseDto> => {
    const validationResult = GetAppointmentsQuerySchema.safeParse(query);
    if (!validationResult.success) {
        throw new ValidationError(
            validationResult.error.issues.map((issue) => ({
                field: issue.path.join('.') || 'query',
                message: issue.message,
            })),
            'Tham số truy vấn không hợp lệ'
        );
    }

    const validatedQuery = validationResult.data;

    if (validatedQuery.fromDate && validatedQuery.toDate) {
        if (validatedQuery.fromDate > validatedQuery.toDate) {
            throw new ValidationError(
                [
                    {
                        field: 'fromDate',
                        message:
                            'Ngày bắt đầu không được lớn hơn ngày kết thúc',
                    },
                ],
                'fromDate phải nhỏ hơn hoặc bằng toDate'
            );
        }
    }

    try {
        const result = await appointmentDao.getAppointments(validatedQuery);

        // Format dữ liệu trả về
        const formattedAppointments: AppointmentResponseDto[] = result.data.map(
            (appointment) => formatAppointmentResponse(appointment)
        );

        return {
            appointments: formattedAppointments,
            pagination: result.metadata,
        };
    } catch (error) {
        if (error instanceof ValidationError || error instanceof CustomError) {
            throw error;
        }
        throw new CustomError(
            ErrorType.INTERNAL_ERROR,
            'Có lỗi xảy ra khi lấy danh sách appointments. Vui lòng thử lại sau.'
        );
    }
};

/**
 * Lấy chi tiết một appointment
 */
const getAppointmentById = async (
    id: string
): Promise<AppointmentResponseDto> => {
    if (!id) {
        throw new ValidationError(
            [{ field: 'id', message: 'ID không được để trống' }],
            'ID appointment không hợp lệ'
        );
    }

    try {
        const appointment = await appointmentDao.getAppointmentById(id);

        if (!appointment) {
            throw new CustomError(
                ErrorType.NOT_FOUND,
                `Không tìm thấy appointment với ID "${id}"`
            );
        }

        return formatAppointmentResponse(appointment);
    } catch (error) {
        if (error instanceof ValidationError || error instanceof CustomError) {
            throw error;
        }
        throw new CustomError(
            ErrorType.INTERNAL_ERROR,
            'Có lỗi xảy ra khi lấy chi tiết appointment. Vui lòng thử lại sau.'
        );
    }
};

/**
 * Tạo appointment mới
 */
const createAppointment = async (
    data: any,
    userId: string
): Promise<AppointmentResponseDto> => {
    // Validate input using helper
    const validatedData = validateOrThrow(
        CreateAppointmentSchema,
        data,
        'Dữ liệu không hợp lệ'
    );

    try {
        const doctor = await doctorDao.getDoctorById(validatedData.doctorId);
        if (!doctor) {
            throw new CustomError(
                ErrorType.NOT_FOUND,
                `Không tìm thấy bác sĩ với ID "${validatedData.doctorId}"`
            );
        }

        const startTime = validatedData.startTime;
        const endTime =
            validatedData.endTime ||
            new Date(startTime.getTime() + DEFAULT_SLOT_DURATION * 60000);
        validateTimeRange(startTime, endTime);

        // If medicalServiceId provided, ensure doctor actually provides this service and it's active
        if (validatedData.medicalServiceId) {
            const docService = await doctorServiceDao.getDoctorService(
                validatedData.doctorId,
                validatedData.medicalServiceId
            );
            if (
                !docService ||
                !docService.isActive ||
                !docService.medicalService.isActive
            ) {
                throw new CustomError(
                    ErrorType.BAD_REQUEST,
                    'Dịch vụ khám không khả dụng cho bác sĩ này'
                );
            }
        }

        const patientId = validatedData.patientId || userId;
        const hasConflict = await appointmentDao.hasConflictingAppointment(
            patientId,
            startTime,
            endTime
        );

        if (hasConflict) {
            throw new CustomError(
                ErrorType.BAD_REQUEST,
                'Bạn đã có lịch hẹn trong khoảng thời gian này. Vui lòng chọn thời gian khác.'
            );
        }

        const appointment = await prisma.$transaction(async (tx) => {
            // Nếu có scheduleId, kiểm tra slot còn chỗ trống không
            if (validatedData.scheduleId) {
                // LOCK schedule row để tránh race condition (SELECT FOR UPDATE)
                // Sử dụng raw query để lock row trong transaction
                const scheduleResult = await tx.$queryRaw<
                    Array<{
                        id: string;
                        start_time: Date;
                        end_time: Date;
                        max_slot: number | null;
                    }>
                >`SELECT id, start_time, end_time, max_slot FROM schedules WHERE id = ${validatedData.scheduleId} FOR UPDATE`;

                if (!scheduleResult || scheduleResult.length === 0) {
                    throw new CustomError(
                        ErrorType.NOT_FOUND,
                        `Không tìm thấy schedule với ID "${validatedData.scheduleId}"`
                    );
                }

                const schedule = scheduleResult[0]!;

                // Ensure requested start/end falls inside schedule bounds
                if (
                    startTime < schedule.start_time ||
                    startTime >= schedule.end_time
                ) {
                    throw new CustomError(
                        ErrorType.BAD_REQUEST,
                        'Thời gian đặt hẹn không thuộc khoảng lịch làm việc của bác sĩ'
                    );
                }

                // Đếm số appointments hiện tại trong slot này
                // Row đã được lock nên đảm bảo count chính xác
                const appointmentCount = await tx.appointment.count({
                    where: {
                        scheduleId: validatedData.scheduleId,
                        status: { not: 'cancelled' },
                        // Appointment giao nhau nếu: startTime < endTime AND (endTime > startTime OR endTime IS NULL)
                        AND: [
                            { startTime: { lt: endTime } },
                            {
                                OR: [
                                    { endTime: { gt: startTime } },
                                    { endTime: null },
                                ],
                            },
                        ],
                    },
                });

                const maxSlot = schedule.max_slot || DEFAULT_MAX_SLOT;

                // Kiểm tra xem slot đã đầy chưa
                if (appointmentCount >= maxSlot) {
                    throw new CustomError(
                        ErrorType.BAD_REQUEST,
                        'Slot thời gian này đã đầy. Vui lòng chọn slot khác.'
                    );
                }
            } else {
                // Nếu không có scheduleId, lock doctor row để tránh race condition
                const doctorResult = await tx.$queryRaw<
                    Array<{ user_id: string }>
                >`SELECT user_id FROM doctors WHERE user_id = ${validatedData.doctorId} FOR UPDATE`;

                if (!doctorResult || doctorResult.length === 0) {
                    throw new CustomError(
                        ErrorType.NOT_FOUND,
                        `Không tìm thấy bác sĩ với ID "${validatedData.doctorId}"`
                    );
                }

                // Kiểm tra xem bác sĩ có rảnh không (với doctor row đã được lock)
                const doctorConflict = await tx.appointment.count({
                    where: {
                        doctorId: validatedData.doctorId,
                        status: { not: 'cancelled' },
                        AND: [
                            { startTime: { lt: endTime } },
                            {
                                OR: [
                                    { endTime: { gt: startTime } },
                                    { endTime: null },
                                ],
                            },
                        ],
                    },
                });

                if (doctorConflict > 0) {
                    throw new CustomError(
                        ErrorType.BAD_REQUEST,
                        'Bác sĩ không rảnh trong khoảng thời gian này. Vui lòng chọn thời gian khác.'
                    );
                }
            }

            // Tạo appointment trong transaction
            return await tx.appointment.create({
                data: {
                    patientId,
                    doctorId: validatedData.doctorId,
                    departmentId: validatedData.departmentId || null,
                    scheduleId: validatedData.scheduleId || null,
                    medicalServiceId: validatedData.medicalServiceId || null,
                    type: validatedData.type || 'new',
                    startTime,
                    endTime,
                    reason: validatedData.reason,
                    notes: validatedData.notes || null,
                    status: 'pending',
                    bookedByUserId: userId,
                },
                include: {
                    patient: {
                        include: {
                            user: {
                                select: {
                                    id: true,
                                    email: true,
                                    phone: true,
                                    avatar: true,
                                    name: {
                                        select: {
                                            firstName: true,
                                            lastName: true,
                                        },
                                    },
                                },
                            },
                        },
                    },
                    doctor: {
                        include: {
                            staff: {
                                include: {
                                    user: {
                                        select: {
                                            name: {
                                                select: {
                                                    firstName: true,
                                                    lastName: true,
                                                },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                    schedule: {
                        include: {
                            room: {
                                select: {
                                    name: true,
                                },
                            },
                            department: {
                                select: {
                                    name: true,
                                },
                            },
                        },
                    },
                    bookedBy: {
                        select: {
                            id: true,
                            name: {
                                select: {
                                    firstName: true,
                                    lastName: true,
                                },
                            },
                        },
                    },
                    department: {
                        select: {
                            name: true,
                            id: true,
                        },
                    },
                    medicalService: {
                        select: {
                            id: true,
                            name: true,
                            durationMinutes: true,
                            price: true,
                        },
                    },
                },
            });
        });

        const patientName =
            `${appointment.patient.user.name?.firstName || ''} ${appointment.patient.user.name?.lastName || ''}`.trim();
        // Gửi thông báo cho bác sĩ về lịch hẹn mới (Lưu DB + emit socket)

        await notificationService.createAndEmit(
            {
                userId: validatedData.doctorId,
                title: 'Lịch hẹn mới',
                content: `Bênh nhân ${patientName} đã đặt lịch khám lúc ${appointment.startTime.toLocaleString('vi-VN')}`,
                type: 'appointment_new',
            },
            APPOINTMENT_EVENTS.NEW
        );

        return formatAppointmentResponse(appointment);
    } catch (error) {
        if (error instanceof ValidationError || error instanceof CustomError) {
            throw error;
        }
        console.error(error);
        throw new CustomError(
            ErrorType.INTERNAL_ERROR,
            'Có lỗi xảy ra khi tạo appointment. Vui lòng thử lại sau.'
        );
    }
};

/**
 * Cập nhật appointment
 */
const updateAppointment = async (
    id: string,
    data: any,
    userRole?: string
): Promise<AppointmentResponseDto> => {
    const validatedData = validateOrThrow(
        UpdateAppointmentSchema,
        data,
        'Dữ liệu không hợp lệ'
    );

    try {
        const existingAppointment = await appointmentDao.getAppointmentById(id);
        if (!existingAppointment) {
            throw new CustomError(
                ErrorType.NOT_FOUND,
                `Không tìm thấy appointment với ID "${id}"`
            );
        }

        // 2. Kiểm tra quy tắc 24h (Patient phải sửa trước 24h)
        if (userRole) {
            const canModify = canModifyAppointment(
                existingAppointment.startTime,
                userRole,
                24
            );

            if (!canModify.allowed) {
                throw new CustomError(
                    ErrorType.BAD_REQUEST,
                    canModify.reason || 'Không thể sửa appointment này'
                );
            }
        }

        // 3. Validate và kiểm tra conflict nếu có thay đổi thời gian
        if (validatedData.startTime || validatedData.endTime) {
            const startTime =
                validatedData.startTime || existingAppointment.startTime;
            const endTime =
                validatedData.endTime || existingAppointment.endTime;

            // Validate time range
            if (endTime) {
                validateTimeRange(startTime, endTime);
            }

            // Kiểm tra conflict với appointments khác
            const hasConflict = await appointmentDao.hasConflictingAppointment(
                existingAppointment.patientId,
                startTime,
                endTime || startTime,
                id // exclude current appointment
            );

            if (hasConflict) {
                throw new CustomError(
                    ErrorType.BAD_REQUEST,
                    'Bạn đã có lịch hẹn trong khoảng thời gian này. Vui lòng chọn thời gian khác.'
                );
            }
        }

        // Kiếm tra xem có phải cần xác nhận lại lịch không
        if (
            userRole === 'patient' &&
            existingAppointment.status === 'confirmed'
        ) {
            if (
                validatedData.startTime &&
                validatedData.startTime !== existingAppointment.startTime
            ) {
                validatedData.status = 'pending';
            }
            if (
                validatedData.endTime &&
                validatedData.endTime !== existingAppointment.endTime
            ) {
                validatedData.status = 'pending';
            }
        }

        // 4. Cập nhật appointment
        const updatedAppointment = await appointmentDao.updateAppointment(
            id,
            validatedData
        );

        // Gửi thông báo khi status === confirmed
        if (validatedData.status === 'confirmed') {
            const doctorName = formatDoctorName(updatedAppointment.doctor);
            await notificationService.createAndEmit(
                {
                    userId: updatedAppointment.patientId,
                    title: 'Lịch hẹn đã được xác nhận',
                    content: `BS. ${doctorName} đã xác nhận lịch hẹn của bạn vào lúc ${updatedAppointment.startTime.toLocaleString('vi-VN')}`,
                    type: 'appointment_confirmed',
                },
                APPOINTMENT_EVENTS.CONFIRMED
            );
        }

        // Nếu có thay đổi thời gian thì thông báo cho bệnh nhân
        if (validatedData.startTime) {
            // Lấy tên bệnh nhân để thông báo cho bác sĩ
            const patientFirstName =
                updatedAppointment.patient?.user?.name?.firstName || '';
            const patientLastName =
                updatedAppointment.patient?.user?.name?.lastName || '';
            const patientName = `${patientFirstName} ${patientLastName}`.trim();
            if (userRole === 'patient') {
                // Bệnh nhân đổi lịch → Thông báo cho bác sĩ
                if (updatedAppointment.doctorId) {
                    await notificationService.createAndEmit(
                        {
                            userId: updatedAppointment.doctorId,
                            title: 'Lịch hẹn được cập nhật',
                            content: `Bệnh nhân ${patientName} đã đổi lịch sang ${validatedData.startTime.toLocaleString('vi-VN')}`,
                            type: 'appointment',
                        },
                        APPOINTMENT_EVENTS.UPDATED
                    );
                }
            } else {
                // Bác sĩ/Admin đổi lịch → Thông báo cho bệnh nhân
                await notificationService.createAndEmit(
                    {
                        userId: updatedAppointment.patientId,
                        title: 'Lịch hẹn được cập nhật',
                        content: `Lịch khám của bạn đã được đổi sang ${validatedData.startTime.toLocaleString('vi-VN')}`,
                        type: 'appointment',
                    },
                    APPOINTMENT_EVENTS.UPDATED
                );
            }
        }

        return formatAppointmentResponse(updatedAppointment);
    } catch (error) {
        if (error instanceof ValidationError || error instanceof CustomError) {
            throw error;
        }
        throw new CustomError(
            ErrorType.INTERNAL_ERROR,
            'Có lỗi xảy ra khi cập nhật appointment. Vui lòng thử lại sau.'
        );
    }
};

/**
 * Hủy appointment
 */
const cancelAppointment = async (id: string, data: any, userRole?: string) => {
    // Validate input using helper
    const { reason } = validateOrThrow<{ reason?: string }>(
        CancelAppointmentSchema,
        data,
        'Dữ liệu không hợp lệ'
    );

    try {
        // 1. Kiểm tra appointment có tồn tại không
        const existingAppointment = await appointmentDao.getAppointmentById(id);
        if (!existingAppointment) {
            throw new CustomError(
                ErrorType.NOT_FOUND,
                `Không tìm thấy appointment với ID "${id}"`
            );
        }

        // 2. Hủy appointment
        const cancelledAppointment = await appointmentDao.cancelAppointment(
            id,
            reason
        );

        const existingPatientId = existingAppointment.patientId;
        const existingDoctorId = existingAppointment.doctorId;

        // Xác định ai là người huỷ lịch hẹn dựa vào userRole
        if (userRole === 'patient') {
            const patientName =
                `${existingAppointment.patient?.user?.name?.firstName || ''} ${existingAppointment.patient?.user?.name?.lastName || ''}`.trim();

            // Bệnh nhân hủy → Thông báo cho bác sĩ
            if (existingDoctorId) {
                await notificationService.createAndEmit(
                    {
                        userId: existingDoctorId,
                        title: 'Lịch hẹn bị hủy',
                        content: reason
                            ? `Bệnh nhân ${patientName} đã hủy lịch khám. Lý do: ${reason}`
                            : `Bệnh nhân ${patientName} đã hủy lịch khám`,
                        type: 'appointment_patient_cancelled',
                    },
                    APPOINTMENT_EVENTS.CANCELLED
                );
            }
        } else {
            const doctorName = formatDoctorName(existingAppointment.doctor);

            // Bác sĩ/Admin hủy → Thông báo cho bệnh nhân
            await notificationService.createAndEmit(
                {
                    userId: existingPatientId,
                    title: 'Lịch hẹn bị hủy',
                    content: reason
                        ? `BS. ${doctorName} đã hủy lịch khám của bạn. Lý do: ${reason}`
                        : `BS. ${doctorName} đã hủy lịch khám của bạn`,
                    type: 'appointment_doctor_cancelled',
                },
                APPOINTMENT_EVENTS.CANCELLED
            );
        }

        return cancelledAppointment;
    } catch (error) {
        if (error instanceof ValidationError || error instanceof CustomError) {
            throw error;
        }
        throw new CustomError(
            ErrorType.INTERNAL_ERROR,
            'Có lỗi xảy ra khi hủy appointment. Vui lòng thử lại sau.'
        );
    }
};

/**
 * Từ chối appointment (chỉ doctor/admin có quyền)
 */
const rejectAppointment = async (
    id: string,
    data: any,
    userRole?: string
): Promise<AppointmentResponseDto> => {
    // Validate input using helper
    const { reasonCancel } = validateOrThrow<{ reasonCancel: string }>(
        RejectAppointmentSchema,
        data,
        'Dữ liệu không hợp lệ'
    );

    try {
        // 1. Kiểm tra appointment có tồn tại không
        const existingAppointment = await appointmentDao.getAppointmentById(id);
        if (!existingAppointment) {
            throw new CustomError(
                ErrorType.NOT_FOUND,
                `Không tìm thấy appointment với ID "${id}"`
            );
        }

        // 2. Kiểm tra quyền: chỉ doctor hoặc admin
        if (userRole !== 'doctor' && userRole !== 'admin') {
            throw new CustomError(
                ErrorType.FORBIDDEN,
                'Chỉ bác sĩ hoặc admin mới có quyền từ chối lịch hẹn'
            );
        }

        // 3. Kiểm tra trạng thái appointment - chỉ có thể từ chối appointment đang pending
        if (existingAppointment.status !== 'pending') {
            throw new CustomError(
                ErrorType.BAD_REQUEST,
                `Chỉ có thể từ chối appointment đang ở trạng thái pending. Trạng thái hiện tại: ${existingAppointment.status}`
            );
        }

        // 4. Từ chối appointment - cập nhật status thành rejected và lưu lý do
        const rejectedAppointment = await appointmentDao.updateAppointment(id, {
            status: 'rejected',
            reasonCancel: reasonCancel,
        });

        //5. Thông báo cho bệnh nhân
        await notificationService.createAndEmit(
            {
                userId: rejectedAppointment.patientId,
                title: 'Lịch hẹn bị từ chối',
                content: `Lịch hẹn của bạn đã bị từ chối. Lý do: ${reasonCancel}`,
                type: 'appointment_rejected',
            },
            APPOINTMENT_EVENTS.REJECTED
        );

        return formatAppointmentResponse(rejectedAppointment);
    } catch (error) {
        if (error instanceof ValidationError || error instanceof CustomError) {
            throw error;
        }
        throw new CustomError(
            ErrorType.INTERNAL_ERROR,
            'Có lỗi xảy ra khi từ chối appointment. Vui lòng thử lại sau.'
        );
    }
};

/**
 * Duyệt appointment (chỉ doctor/admin có quyền)
 */
const approveAppointment = async (
    id: string,
    data: any,
    userRole?: string
): Promise<AppointmentResponseDto> => {
    // Validate input using helper
    const { notes } = validateOrThrow<{ notes?: string }>(
        ApproveAppointmentSchema,
        data,
        'Dữ liệu không hợp lệ'
    );

    try {
        // 1. Kiểm tra appointment có tồn tại không
        const existingAppointment = await appointmentDao.getAppointmentById(id);
        if (!existingAppointment) {
            throw new CustomError(
                ErrorType.NOT_FOUND,
                `Không tìm thấy appointment với ID "${id}"`
            );
        }

        // 2. Kiểm tra quyền: chỉ doctor hoặc admin
        if (userRole !== 'doctor' && userRole !== 'admin') {
            throw new CustomError(
                ErrorType.FORBIDDEN,
                'Chỉ bác sĩ hoặc admin mới có quyền duyệt lịch hẹn'
            );
        }

        // 3. Kiểm tra trạng thái appointment - chỉ có thể duyệt appointment đang pending
        if (existingAppointment.status !== 'pending') {
            throw new CustomError(
                ErrorType.BAD_REQUEST,
                `Chỉ có thể duyệt appointment đang ở trạng thái pending. Trạng thái hiện tại: ${existingAppointment.status}`
            );
        }

        // 4. Duyệt appointment - cập nhật status thành confirmed
        const updateData: any = {
            status: 'confirmed',
        };

        if (notes) {
            updateData.notes = notes;
        }

        const approvedAppointment = await appointmentDao.updateAppointment(
            id,
            updateData
        );

        // Thông báo cho bệnh nhân
        await notificationService.createAndEmit(
            {
                userId: approvedAppointment.patientId,
                title: 'Lịch hẹn đã được xác nhận',
                content: `Lịch hẹn của bạn đã được xác nhận. Vui lòng đến khám bệnh vào lúc ${approvedAppointment.startTime.toLocaleString('vi-VN')}`,
                type: 'appointment_confirmed',
            },
            APPOINTMENT_EVENTS.CONFIRMED
        );

        return formatAppointmentResponse(approvedAppointment);
    } catch (error) {
        if (error instanceof ValidationError || error instanceof CustomError) {
            throw error;
        }
        throw new CustomError(
            ErrorType.INTERNAL_ERROR,
            'Có lỗi xảy ra khi duyệt appointment. Vui lòng thử lại sau.'
        );
    }
};

export default {
    getAvailableSlots,
    getAppointments,
    getAppointmentById,
    createAppointment,
    updateAppointment,
    cancelAppointment,
    rejectAppointment,
    approveAppointment,
};
