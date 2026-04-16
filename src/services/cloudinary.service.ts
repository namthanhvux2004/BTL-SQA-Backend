import fs from 'fs';
import cloudinary from '@config/cloudinary';

/**
 * Upload file lên Cloudinary
 * @param {string} filePath - Đường dẫn file tạm
 * @param {object} options - Tùy chọn upload
 * @param {string} [options.folder] - Thư mục lưu (fallback nếu preset không có)
 * @param {string} [options.publicId] - Tên file mong muốn
 * @param {string} [options.uploadPreset] - Tên upload preset (nếu có)
 * @param {boolean} [options.autoDeleteLocalFile=true] - Có xóa file local sau khi upload không
 */
export const uploadToCloudinary = async (
    filePath: string,
    options: {
        folder?: string;
        publicId?: string;
        uploadPreset?: string;
        autoDeleteLocalFile?: boolean;
    }
) => {
    const {
        folder,
        publicId,
        uploadPreset,
        autoDeleteLocalFile = true,
    } = options;

    try {
        // Kiểm tra file path tồn tại
        if (!filePath) {
            throw new Error('File path is required');
        }

        // Kiểm tra file có tồn tại trên disk không
        if (!fs.existsSync(filePath)) {
            throw new Error(`File does not exist at path: ${filePath}`);
        }

        const uploadOptions: any = {
            overwrite: true,
        };

        if (publicId) {
            uploadOptions.public_id = publicId;
        }

        if (uploadPreset) {
            uploadOptions.upload_preset = uploadPreset;
        } else {
            uploadOptions.folder = folder || 'healthsystem/uploads';
            uploadOptions.resource_type = 'auto';
        }

        const result = await cloudinary.uploader.upload(
            filePath,
            uploadOptions
        );

        if (autoDeleteLocalFile && fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        return {
            url: result.secure_url,
            public_id: result.public_id,
            format: result.format,
            folder: result.folder,
        };
    } catch (error) {
        throw new Error(
            `Không thể upload lên Cloudinary: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
    }
};

/**
 * Xóa file trên Cloudinary bằng URL
 * @param {string} imageUrl - URL của ảnh cần xóa
 */
export const deleteFromCloudinary = async (imageUrl: string) => {
    try {
        const urlParts = imageUrl.split('/');
        const uploadIndex = urlParts.indexOf('upload');

        if (uploadIndex === -1) {
            throw new Error('Invalid Cloudinary URL');
        }

        const publicIdWithExtension = urlParts.slice(uploadIndex + 2).join('/');

        const publicId = publicIdWithExtension.substring(
            0,
            publicIdWithExtension.lastIndexOf('.')
        );

        const result = await cloudinary.uploader.destroy(publicId);

        if (result.result === 'ok' || result.result === 'not found') {
            return { success: true, publicId };
        }

        throw new Error(`Delete failed: ${result.result}`);
    } catch (error) {
        return { success: false, error };
    }
};
