import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const options: swaggerJsdoc.Options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Node.js TypeScript API Documentation',
            version: '1.0.0',
            description: 'API documentation for HealthCare System',
            termsOfService: 'http://example.com/terms/',
            contact: {
                name: 'API Support',
                url: 'http://www.example.com/support',
                email: 'support@example.com',
            },
            license: {
                name: 'MIT',
                url: 'https://opensource.org/licenses/MIT',
            },
        },
        servers: [
            {
                url: 'http://localhost:5000',
                description: 'Development server',
            },
            {
                url: 'https://staging-api.example.com',
                description: 'Staging server',
            },
            {
                url: 'https://api.example.com',
                description: 'Production server',
            },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                    description:
                        'JWT Authorization header using the Bearer scheme',
                },
                apiKey: {
                    type: 'apiKey',
                    in: 'header',
                    name: 'X-API-Key',
                    description: 'API Key for authentication',
                },
            },
            schemas: {
                User: {
                    type: 'object',
                    properties: {
                        id: {
                            type: 'string',
                            format: 'uuid',
                            example: '123e4567-e89b-12d3-a456-426614174000',
                        },
                        username: {
                            type: 'string',
                            example: 'johndoe',
                        },
                        email: {
                            type: 'string',
                            format: 'email',
                            example: 'john.doe@example.com',
                        },
                        roleId: {
                            type: 'integer',
                            example: 1,
                        },
                        role: {
                            $ref: '#/components/schemas/Role',
                        },
                        avatar: {
                            type: 'string',
                            format: 'uri',
                            example: 'https://example.com/avatar.jpg',
                        },
                        birthday: {
                            type: 'string',
                            format: 'date-time',
                            example: '1990-01-01T00:00:00.000Z',
                        },
                        gender: {
                            type: 'string',
                            enum: ['male', 'female', 'other'],
                            example: 'male',
                        },
                        createdAt: {
                            type: 'string',
                            format: 'date-time',
                            example: '2023-01-01T00:00:00.000Z',
                        },
                        updatedAt: {
                            type: 'string',
                            format: 'date-time',
                            example: '2023-01-01T00:00:00.000Z',
                        },
                        phone: {
                            type: 'string',
                            example: '+1234567890',
                        },
                        addressId: {
                            type: 'string',
                            format: 'uuid',
                        },
                        name: {
                            $ref: '#/components/schemas/Name',
                        },
                        address: {
                            $ref: '#/components/schemas/Address',
                        },
                        detail: {
                            $ref: '#/components/schemas/Patient',
                        },
                        authentication: {
                            $ref: '#/components/schemas/Authentication',
                        },
                        verificationToken: {
                            type: 'array',
                            items: {
                                $ref: '#/components/schemas/VerificationToken',
                            },
                        },
                    },
                    required: [
                        'id',
                        'username',
                        'email',
                        'roleId',
                        'role',
                        'gender',
                        'createdAt',
                        'updatedAt',
                    ],
                },
                Role: {
                    type: 'object',
                    properties: {
                        id: {
                            type: 'integer',
                            example: 1,
                        },
                        name: {
                            type: 'string',
                            enum: [
                                'patient',
                                'doctor',
                                'admin',
                                'pharmacist',
                                'accountant',
                            ],
                            example: 'patient',
                        },
                    },
                    required: ['id', 'name'],
                },
                Name: {
                    type: 'object',
                    properties: {
                        firstName: {
                            type: 'string',
                            example: 'John',
                        },
                        lastName: {
                            type: 'string',
                            example: 'Doe',
                        },
                        userId: {
                            type: 'string',
                            format: 'uuid',
                        },
                    },
                    required: ['firstName', 'lastName', 'userId'],
                },
                Address: {
                    type: 'object',
                    properties: {
                        id: {
                            type: 'string',
                            format: 'uuid',
                        },
                        detail: {
                            type: 'string',
                            example: '123 Main St',
                        },
                        ward: {
                            type: 'string',
                            example: 'Ward 1',
                        },
                        district: {
                            type: 'string',
                            example: 'District 1',
                        },
                        city: {
                            type: 'string',
                            example: 'City',
                        },
                        country: {
                            type: 'string',
                            example: 'Country',
                        },
                        createdAt: {
                            type: 'string',
                            format: 'date-time',
                        },
                        updatedAt: {
                            type: 'string',
                            format: 'date-time',
                        },
                    },
                    required: [
                        'id',
                        'detail',
                        'ward',
                        'district',
                        'city',
                        'country',
                        'createdAt',
                        'updatedAt',
                    ],
                },
                Patient: {
                    type: 'object',
                    properties: {
                        id: {
                            type: 'integer',
                            example: 1,
                        },
                        username: {
                            type: 'string',
                            example: 'johndoe',
                        },
                        email: {
                            type: 'string',
                            format: 'email',
                            example: 'patient@example.com',
                        },
                        birthday: {
                            type: 'string',
                            format: 'date',
                            example: '1990-01-01',
                        },
                        gender: {
                            type: 'string',
                            enum: ['male', 'female', 'other'],
                            example: 'male',
                        },
                        phone: {
                            type: 'string',
                            example: '1234567890',
                        },
                        address: {
                            type: 'object',
                            properties: {
                                detail: {
                                    type: 'string',
                                },
                            },
                        },
                    },
                },
                MedicalRecord: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        doctorId: {
                            type: 'string',
                            format: 'uuid',
                            nullable: true,
                        },
                        title: { type: 'string' },
                        symptoms: { type: 'string' },
                        diagnosis: { type: 'string' },
                        treatments: { type: 'string' },
                        notes: { type: 'string', nullable: true },
                        visitId: { type: 'string', format: 'uuid' },
                        fileAssets: {
                            type: 'array',
                            items: { $ref: '#/components/schemas/FileAsset' },
                        },
                        createdAt: { type: 'string', format: 'date-time' },
                        updatedAt: { type: 'string', format: 'date-time' },
                    },
                },
                FileAsset: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        url: { type: 'string', format: 'uri' },
                        entityType: {
                            type: 'string',
                            enum: ['medical_record', 'prescription', 'other'],
                        },
                        entityId: { type: 'string', format: 'uuid' },
                        fileType: { type: 'string' },
                        mimeType: { type: 'string' },
                        isPrivate: { type: 'boolean' },
                        createdAt: { type: 'string', format: 'date-time' },
                        updatedAt: { type: 'string', format: 'date-time' },
                    },
                },
                CloudinaryUploadResult: {
                    type: 'object',
                    properties: {
                        url: { type: 'string', format: 'uri' },
                        public_id: { type: 'string' },
                        format: { type: 'string' },
                        folder: { type: 'string' },
                        bytes: { type: 'integer' },
                        mimeType: { type: 'string' },
                        originalName: { type: 'string' },
                    },
                },
                Authentication: {
                    type: 'object',
                    properties: {
                        userId: {
                            type: 'string',
                            format: 'uuid',
                        },
                        isVerified: {
                            type: 'boolean',
                            example: false,
                        },
                        googleId: {
                            type: 'string',
                        },
                        facebookId: {
                            type: 'string',
                        },
                        lastLogin: {
                            type: 'string',
                            format: 'date-time',
                        },
                        createdAt: {
                            type: 'string',
                            format: 'date-time',
                        },
                    },
                    required: ['userId', 'isVerified', 'createdAt'],
                },
                VerificationToken: {
                    type: 'object',
                    properties: {
                        id: {
                            type: 'string',
                            format: 'uuid',
                        },
                        userId: {
                            type: 'string',
                            format: 'uuid',
                        },
                        token: {
                            type: 'string',
                            example: 'hashed_token_here',
                        },
                        createdAt: {
                            type: 'string',
                            format: 'date-time',
                        },
                        expiresAt: {
                            type: 'string',
                            format: 'date-time',
                        },
                    },
                    required: [
                        'id',
                        'userId',
                        'token',
                        'createdAt',
                        'expiresAt',
                    ],
                },
                ValidationErrors: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            field: {
                                type: 'string',
                            },
                            message: {
                                type: 'string',
                            },
                        },
                    },
                },
                EmergencyContact: {
                    type: 'object',
                    properties: {
                        id: {
                            type: 'string',
                            format: 'uuid',
                            description: 'ID của liên hệ khẩn cấp',
                        },
                        patientId: {
                            type: 'string',
                            format: 'uuid',
                            description: 'ID của người dùng là bệnh nhân',
                        },
                        fullName: {
                            type: 'string',
                            description: 'Họ và tên của liên hệ khẩn cấp',
                        },
                        relationship: {
                            type: 'string',
                            description: 'Mối quan hệ với bệnh nhân',
                        },
                        phone: {
                            type: 'string',
                            description: 'Số điện thoại liên hệ',
                        },
                        email: {
                            type: 'string',
                            format: 'email',
                            nullable: true,
                            description: 'Địa chỉ email liên hệ',
                        },
                        createdAt: {
                            type: 'string',
                            format: 'date-time',
                            description: 'Thời gian tạo liên hệ',
                        },
                        updatedAt: {
                            type: 'string',
                            format: 'date-time',
                            description: 'Thời gian cập nhật liên hệ',
                        },
                    },
                    required: [
                        'id',
                        'patientId',
                        'fullName',
                        'relationship',
                        'phone',
                        'createdAt',
                        'updatedAt',
                    ],
                },
                HealthInsuranceDto: {
                    type: 'object',
                    properties: {
                        id: {
                            type: 'string',
                            format: 'uuid',
                            description: 'ID của bảo hiểm',
                        },
                        userId: {
                            type: 'string',
                            format: 'uuid',
                            description: 'ID của bệnh nhân',
                        },
                        type: {
                            type: 'string',
                            description: 'Loại bảo hiểm, ví dụ: BHYT',
                        },
                        insuranceId: {
                            type: 'string',
                            description: 'Mã số thẻ bảo hiểm',
                        },
                        startAt: {
                            type: 'string',
                            format: 'date-time',
                            description: 'Ngày bắt đầu hiệu lực',
                        },
                        endAt: {
                            type: 'string',
                            format: 'date-time',
                            description: 'Ngày kết thúc hiệu lực',
                        },
                        level_of_benefit: {
                            type: 'number',
                            description: 'Mức độ quyền lợi (ví dụ: 1, 2, 3)',
                            nullable: true,
                        },
                        province_code: {
                            type: 'string',
                            description: 'Mã tỉnh cấp thẻ',
                            nullable: true,
                        },
                        initial_kcb_code: {
                            type: 'string',
                            description: 'Mã nơi KCB ban đầu',
                            nullable: true,
                        },
                        initial_kcb_name: {
                            type: 'string',
                            description: 'Tên nơi KCB ban đầu',
                            nullable: true,
                        },
                    },
                    required: [
                        'userId',
                        'type',
                        'insuranceId',
                        'startAt',
                        'endAt',
                    ],
                },
                HealthInsurance: {
                    type: 'object',
                    properties: {
                        id: {
                            type: 'string',
                            format: 'uuid',
                            example: '123e4567-e89b-12d3-a456-426614174000',
                        },
                        userId: {
                            type: 'string',
                            format: 'uuid',
                            example: '123e4567-e89b-12d3-a456-426614174000',
                        },
                        type: {
                            type: 'string',
                            example: 'BHYT',
                        },
                        insuranceId: {
                            type: 'string',
                            example: 'INS123456789',
                        },
                        startAt: {
                            type: 'string',
                            format: 'date-time',
                            example: '2024-01-01T00:00:00.000Z',
                        },
                        endAt: {
                            type: 'string',
                            format: 'date-time',
                            example: '2024-12-31T23:59:59.999Z',
                        },
                        percentage: {
                            type: 'number',
                            format: 'float',
                            example: 80.0,
                            description: 'Percentage of coverage',
                        },
                        createdAt: {
                            type: 'string',
                            format: 'date-time',
                            example: '2024-01-01T00:00:00.000Z',
                        },
                        updatedAt: {
                            type: 'string',
                            format: 'date-time',
                            example: '2024-01-01T00:00:00.000Z',
                        },
                    },
                    required: [
                        'id',
                        'userId',
                        'type',
                        'insuranceId',
                        'startAt',
                        'endAt',
                        'percentage',
                        'createdAt',
                        'updatedAt',
                    ],
                },
                Payment: {
                    type: 'object',
                    properties: {
                        id: {
                            type: 'string',
                            format: 'uuid',
                            example: 'payment-001',
                        },
                        invoiceId: {
                            type: 'string',
                            format: 'uuid',
                            example: '123e4567-e89b-12d3-a456-426614174000',
                        },
                        userName: { type: 'string', example: 'Nguyễn Văn A' },
                        paymentMethod: {
                            type: 'string',
                            enum: [
                                'cash_on_delivery',
                                'credit_card',
                                'bank_transfer',
                            ],
                            example: 'bank_transfer',
                        },
                        amount: { type: 'number', example: 100000 },
                        status: {
                            type: 'string',
                            enum: [
                                'pending',
                                'processing',
                                'completed',
                                'failed',
                                'refunded',
                            ],
                            example: 'completed',
                        },
                        message: {
                            type: 'string',
                            nullable: true,
                            example: 'Thanh toán thành công',
                        },
                        metadata: {
                            type: 'object',
                            nullable: true,
                            additionalProperties: true,
                            example: { vnp_TxnRef: '1732512000123456' },
                        },
                        createdAt: {
                            type: 'string',
                            format: 'date-time',
                            example: '2025-11-25T10:00:00.000Z',
                        },
                        updatedAt: {
                            type: 'string',
                            format: 'date-time',
                            example: '2025-11-25T10:00:00.000Z',
                        },
                    },
                    required: [
                        'id',
                        'invoiceId',
                        'paymentMethod',
                        'amount',
                        'status',
                        'createdAt',
                        'updatedAt',
                    ],
                },
                HealthInformation: {
                    type: 'object',
                    properties: {
                        id: {
                            type: 'string',
                            format: 'uuid',
                            example: '123e4567-e89b-12d3-a456-426614174000',
                        },
                        patientId: {
                            type: 'string',
                            format: 'uuid',
                            example: '123e4567-e89b-12d3-a456-426614174000',
                        },
                        weight: {
                            type: 'number',
                            format: 'float',
                            example: 70.5,
                            description: 'Weight in kg',
                            nullable: true,
                        },
                        height: {
                            type: 'number',
                            format: 'float',
                            example: 175.0,
                            description: 'Height in cm',
                            nullable: true,
                        },
                        bloodType: {
                            type: 'string',
                            example: 'O+',
                            nullable: true,
                        },
                        has_high_blood_pressure: {
                            type: 'boolean',
                            example: false,
                            nullable: true,
                        },
                        has_diabetes: {
                            type: 'boolean',
                            example: false,
                            nullable: true,
                        },
                        has_allergies: {
                            type: 'boolean',
                            example: false,
                            nullable: true,
                        },
                        has_cancer: {
                            type: 'boolean',
                            example: false,
                            nullable: true,
                        },
                        createdAt: {
                            type: 'string',
                            format: 'date-time',
                            example: '2024-01-01T00:00:00.000Z',
                        },
                        updatedAt: {
                            type: 'string',
                            format: 'date-time',
                            example: '2024-01-01T00:00:00.000Z',
                        },
                    },
                    required: ['id', 'patientId', 'createdAt', 'updatedAt'],
                },
                EHR: {
                    type: 'object',
                    properties: {
                        id: {
                            type: 'string',
                            format: 'uuid',
                            example: '123e4567-e89b-12d3-a456-426614174000',
                        },
                        patientId: {
                            type: 'string',
                            format: 'uuid',
                            example: '123e4567-e89b-12d3-a456-426614174000',
                            nullable: true,
                        },
                        createdAt: {
                            type: 'string',
                            format: 'date-time',
                            example: '2024-01-01T00:00:00.000Z',
                        },
                        updatedAt: {
                            type: 'string',
                            format: 'date-time',
                            example: '2024-01-01T00:00:00.000Z',
                        },
                    },
                    required: ['id', 'createdAt', 'updatedAt'],
                },
                PatientDetail: {
                    type: 'object',
                    properties: {
                        userId: {
                            type: 'string',
                            format: 'uuid',
                            example: '123e4567-e89b-12d3-a456-426614174000',
                        },
                        patientId: {
                            type: 'string',
                            example: 'cuid_patient_id',
                        },
                        user: {
                            $ref: '#/components/schemas/User',
                        },
                        healthInsurance: {
                            type: 'array',
                            items: {
                                $ref: '#/components/schemas/HealthInsurance',
                            },
                        },
                        healthInfo: {
                            $ref: '#/components/schemas/HealthInformation',
                            nullable: true,
                        },
                        ehr: {
                            $ref: '#/components/schemas/EHR',
                            nullable: true,
                        },
                        emergencyContact: {
                            type: 'array',
                            items: {
                                $ref: '#/components/schemas/EmergencyContact',
                            },
                        },
                    },
                    required: ['userId', 'patientId'],
                },
                Category: {
                    type: 'object',
                    properties: {
                        id: {
                            type: 'string',
                            format: 'uuid',
                            example: '123e4567-e89b-12d3-a456-426614174000',
                        },
                        name: {
                            type: 'string',
                            example: 'Cardiology',
                        },
                        slug: {
                            type: 'string',
                            example: 'cardiology',
                        },
                        description: {
                            type: 'string',
                            example: 'Deals with disorders of the heart.',
                        },
                        parentId: {
                            type: 'string',
                            format: 'uuid',
                            example: '123e4567-e89b-12d3-a456-426614174001',
                        },
                        createdAt: {
                            type: 'string',
                            format: 'date-time',
                            example: '2025-01-01T00:00:00.000Z',
                        },
                        updatedAt: {
                            type: 'string',
                            format: 'date-time',
                            example: '2025-01-01T00:00:00.000Z',
                        },
                    },
                    required: [
                        'id',
                        'name',
                        'slug',
                        'description',
                        'parentId',
                        'createdAt',
                        'updatedAt',
                    ],
                },
                UpdateCategoryDto: {
                    type: 'object',
                    properties: {
                        name: {
                            type: 'string',
                            description: 'The name of the category.',
                            example: 'Cardiology',
                        },
                        description: {
                            type: 'string',
                            description: 'A short description of the category.',
                            example: 'Deals with disorders of the heart.',
                        },
                        parentId: {
                            type: 'string',
                            format: 'uuid',
                            description:
                                'The ID of the parent category, if any.',
                            example: '123e4567-e89b-12d3-a456-426614174001',
                        },
                    },
                },
                AddCategoryDto: {
                    type: 'object',
                    properties: {
                        name: {
                            type: 'string',
                            description: 'The name of the category.',
                            example: 'Cardiology',
                        },
                        description: {
                            type: 'string',
                            description: 'A short description of the category.',
                            example: 'Deals with disorders of the heart.',
                        },
                        parentId: {
                            type: 'string',
                            format: 'uuid',
                            description:
                                'The ID of the parent category, if any.',
                            example: '123e4567-e89b-12d3-a456-426614174001',
                        },
                    },
                    required: ['name', 'description', 'parentId'],
                },
                PaginationMetadata: {
                    type: 'object',
                    properties: {
                        page: {
                            type: 'number',
                        },
                        limit: {
                            type: 'number',
                        },
                        totalItems: {
                            type: 'number',
                        },
                        totalPages: {
                            type: 'number',
                        },
                        hasNext: {
                            type: 'boolean',
                        },
                        hasPrev: {
                            type: 'boolean',
                        },
                    },
                },
                Contact: {
                    type: 'object',
                    properties: {
                        id: {
                            type: 'string',
                            format: 'uuid',
                            description: 'ID của tin nhắn liên hệ',
                            example: '123e4567-e89b-12d3-a456-426614174000',
                        },
                        userId: {
                            type: 'string',
                            format: 'uuid',
                            nullable: true,
                            description:
                                'ID của người dùng gửi tin nhắn (nếu đã đăng nhập)',
                            example: '123e4567-e89b-12d3-a456-426614174000',
                        },
                        fullname: {
                            type: 'string',
                            description: 'Họ và tên đầy đủ',
                            example: 'Nguyễn Văn An',
                        },
                        email: {
                            type: 'string',
                            format: 'email',
                            description: 'Địa chỉ email',
                            example: 'nguyen.van.an@example.com',
                        },
                        phone: {
                            type: 'string',
                            nullable: true,
                            description: 'Số điện thoại',
                            example: '0123456789',
                        },
                        subject: {
                            type: 'string',
                            nullable: true,
                            description: 'Tiêu đề tin nhắn',
                            example: 'Câu hỏi về việc đặt lịch khám',
                        },
                        content: {
                            type: 'string',
                            description: 'Nội dung tin nhắn',
                            example:
                                'Tôi muốn biết thêm thông tin về dịch vụ khám sức khỏe...',
                        },
                        isRead: {
                            type: 'boolean',
                            description: 'Trạng thái đã đọc',
                            example: false,
                        },
                        reply: {
                            type: 'string',
                            nullable: true,
                            description: 'Nội dung phản hồi từ admin/staff',
                            example:
                                'Cảm ơn bạn đã liên hệ. Chúng tôi đã ghi nhận yêu cầu...',
                        },
                        replyAt: {
                            type: 'string',
                            format: 'date-time',
                            nullable: true,
                            description: 'Thời gian phản hồi',
                            example: '2025-01-15T10:30:00.000Z',
                        },
                        userIdReply: {
                            type: 'string',
                            format: 'uuid',
                            nullable: true,
                            description: 'ID của staff đã phản hồi',
                            example: '123e4567-e89b-12d3-a456-426614174001',
                        },
                        user: {
                            type: 'object',
                            nullable: true,
                            description: 'Thông tin người gửi tin nhắn',
                            properties: {
                                id: {
                                    type: 'string',
                                    format: 'uuid',
                                },
                                username: {
                                    type: 'string',
                                },
                                email: {
                                    type: 'string',
                                },
                            },
                        },
                        userReply: {
                            type: 'object',
                            nullable: true,
                            description: 'Thông tin staff đã phản hồi',
                            properties: {
                                userId: {
                                    type: 'string',
                                    format: 'uuid',
                                },
                                position: {
                                    type: 'string',
                                    description: 'Chức vụ',
                                },
                                user: {
                                    type: 'object',
                                    properties: {
                                        id: {
                                            type: 'string',
                                            format: 'uuid',
                                        },
                                        username: {
                                            type: 'string',
                                        },
                                        email: {
                                            type: 'string',
                                        },
                                    },
                                },
                            },
                        },
                        createdAt: {
                            type: 'string',
                            format: 'date-time',
                            description: 'Thời gian tạo tin nhắn',
                            example: '2025-01-10T08:00:00.000Z',
                        },
                        updatedAt: {
                            type: 'string',
                            format: 'date-time',
                            description: 'Thời gian cập nhật tin nhắn',
                            example: '2025-01-15T10:30:00.000Z',
                        },
                    },
                    required: [
                        'id',
                        'fullname',
                        'email',
                        'content',
                        'isRead',
                        'createdAt',
                        'updatedAt',
                    ],
                },
                ContactList: {
                    type: 'object',
                    properties: {
                        items: {
                            type: 'array',
                            items: {
                                $ref: '#/components/schemas/Contact',
                            },
                        },
                        metadata: {
                            $ref: '#/components/schemas/PaginationMetadata',
                        },
                    },
                },
                ContactStatistics: {
                    type: 'object',
                    properties: {
                        total: {
                            type: 'integer',
                            description: 'Tổng số tin nhắn',
                            example: 150,
                        },
                        unread: {
                            type: 'integer',
                            description: 'Số tin nhắn chưa đọc',
                            example: 45,
                        },
                        read: {
                            type: 'integer',
                            description: 'Số tin nhắn đã đọc',
                            example: 105,
                        },
                        readPercentage: {
                            type: 'integer',
                            description: 'Phần trăm tin nhắn đã đọc',
                            example: 70,
                        },
                    },
                    required: ['total', 'unread', 'read', 'readPercentage'],
                },
            },
            responses: {
                SuccessResponse: {
                    description: 'Success response',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    success: {
                                        type: 'boolean',
                                        example: true,
                                    },
                                    message: {
                                        type: 'string',
                                        example: 'Success',
                                    },
                                    data: {
                                        type: 'object',
                                        example: {},
                                    },
                                },
                            },
                        },
                    },
                },
                UnauthorizedError: {
                    description: 'Access token is missing or invalid',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    success: {
                                        type: 'boolean',
                                        example: false,
                                    },
                                    message: {
                                        type: 'string',
                                        example:
                                            'Access denied. No token provided.',
                                    },
                                    error: {
                                        type: 'string',
                                        example: 'UNAUTHORIZED',
                                    },
                                },
                            },
                        },
                    },
                },
                ForbiddenError: {
                    description: 'Access denied or insufficient permissions',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    success: {
                                        type: 'boolean',
                                        example: false,
                                    },
                                    message: {
                                        type: 'string',
                                        example: 'Access denied',
                                    },
                                    error: {
                                        type: 'string',
                                        example: 'FORBIDDEN',
                                    },
                                },
                            },
                        },
                    },
                },
                ValidationError: {
                    description: 'Validation error',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    success: {
                                        type: 'boolean',
                                        example: false,
                                    },
                                    message: {
                                        type: 'string',
                                        example: 'Validation failed',
                                    },
                                    error: {
                                        type: 'string',
                                        example: 'VALIDATION_ERROR',
                                    },
                                    details: {
                                        type: 'array',
                                        items: {
                                            type: 'object',
                                            properties: {
                                                field: {
                                                    type: 'string',
                                                },
                                                message: {
                                                    type: 'string',
                                                },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
                NotFoundError: {
                    description: 'Resource not found',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    success: {
                                        type: 'boolean',
                                        example: false,
                                    },
                                    message: {
                                        type: 'string',
                                        example: 'Resource not found',
                                    },
                                    error: {
                                        type: 'string',
                                        example: 'NOT_FOUND',
                                    },
                                },
                            },
                        },
                    },
                },
                ServerError: {
                    description: 'Internal server error',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    success: {
                                        type: 'boolean',
                                        example: false,
                                    },
                                    message: {
                                        type: 'string',
                                        example: 'Internal server error',
                                    },
                                    error: {
                                        type: 'string',
                                        example: 'INTERNAL_SERVER_ERROR',
                                    },
                                },
                                example: {
                                    success: false,
                                    message: 'Internal server error',
                                    error: 'INTERNAL_SERVER_ERROR',
                                },
                            },
                        },
                    },
                },
            },
        },
        security: [
            {
                bearerAuth: [],
            },
        ],
    },
    apis: [
        './src/routes/*.ts',
        './src/controllers/*.ts',
        './src/models/*.ts',
        './src/docs/schemas/*.ts',
    ],
};

const specs = swaggerJsdoc(options);

// Swagger UI options
const swaggerUiOptions = {
    explorer: true,
    swaggerOptions: {
        persistAuthorization: true,
        displayRequestDuration: true,
        // Enable export to Postman and other formats
        displayOperationId: true,
        showExtensions: true,
        showCommonExtensions: true,
        // Add Postman export button
        plugins: [
            {
                statePlugins: {
                    spec: {
                        wrapActions: {
                            updateSpec: (oriAction: any) => (spec: any) => {
                                return oriAction(spec);
                            },
                        },
                    },
                },
            },
        ],
    },
    customCss: `
    .swagger-ui .topbar { 
      display: none 
    }
    .swagger-ui .info .title {
      color: #3b82f6;
    }
    .swagger-ui .info {
      margin-bottom: 20px;
    }
  `,
    customSiteTitle: 'API Documentation | HealthCare System',
    // Add custom JS to enable Postman export
    customJs: '/swagger-custom.js',
};

export { specs, swaggerUi, swaggerUiOptions };
