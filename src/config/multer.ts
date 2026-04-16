import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Tạo thư mục upload nếu chưa có
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Cấu hình nơi lưu trữ và tên file
const storage = multer.diskStorage({
    destination: (_req, _file, cb) => {
        cb(null, uploadDir);
    },
    filename: (_req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext = path.extname(file.originalname);
        const filename = `${file.fieldname}-${uniqueSuffix}${ext}`;
        cb(null, filename);
    },
});

// Giới hạn dung lượng và định dạng
const fileFilter: multer.Options['fileFilter'] = (_req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];

    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(
            new Error(
                `Chỉ được upload ảnh có định dạng JPEG, PNG, JPG, WEBP. Nhận được: ${file.mimetype}`
            )
        );
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
    },
});

// Multer config for medical records (images + PDF)
const medicalRecordFileFilter: multer.Options['fileFilter'] = (
    _req,
    file,
    cb
) => {
    const allowedTypes = [
        'image/jpeg',
        'image/png',
        'image/jpg',
        'application/pdf',
    ];

    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(
            new Error(
                `Chỉ được upload ảnh (JPEG, PNG, JPG) hoặc PDF. Nhận được: ${file.mimetype}`
            )
        );
    }
};

export const uploadMedicalRecordFiles = multer({
    storage,
    fileFilter: medicalRecordFileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
    },
});

export default upload;
