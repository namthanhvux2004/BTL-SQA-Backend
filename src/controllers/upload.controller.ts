import { Request, Response } from 'express';
import z, { ZodIssue } from 'zod';
import { SuccessResponse } from '@src/core/ApiResponse';
import { uploadToCloudinary } from '@services/cloudinary.service';
import {
    singleUploadedFileDto,
    uploadFileOptionsDto,
    UploadFileOptionsDto,
} from '@src/dtos/upload.dto';
import { CustomError, ErrorType, ValidationError } from '@src/core/Error';

const mapZodIssues = (issues: ZodIssue[], fallbackField: string) =>
    issues.map((issue) => ({
        field: issue.path.join('.') || fallbackField,
        message: issue.message,
    }));

const uploadFiles = async (req: Request, res: Response) => {
    const bodyValidation = uploadFileOptionsDto.safeParse(req.body);
    if (!bodyValidation.success) {
        throw new ValidationError(
            mapZodIssues(bodyValidation.error.issues, 'body'),
            'Tham số upload không hợp lệ'
        );
    }

    if (!req.files) {
        throw new CustomError(
            ErrorType.BAD_REQUEST,
            'Vui lòng chọn file cần upload.'
        );
    }

    const filesValidation = z.array(singleUploadedFileDto).safeParse(req.files);
    if (!filesValidation.success) {
        throw new ValidationError(
            mapZodIssues(filesValidation.error.issues, 'file'),
            'File upload không hợp lệ'
        );
    }

    const files = filesValidation.data;
    const options = bodyValidation.data as UploadFileOptionsDto;
    const { folder, publicId, uploadPreset } = options;

    const uploadResults = await Promise.all(
        files.map((file) =>
            uploadToCloudinary(file.path, {
                ...(folder ? { folder } : {}),
                ...(publicId ? { publicId } : {}),
                ...(uploadPreset ? { uploadPreset } : {}),
            })
        )
    );

    return new SuccessResponse(
        uploadResults.map((result, index) => ({
            url: result.url,
            publicId: result.public_id,
            format: result.format,
            folder: result.folder,
            bytes: files?.[index]?.size,
            mimeType: files?.[index]?.mimetype,
            originalName: files?.[index]?.originalname,
        })),
        'Upload file thành công'
    ).send(res);
};

export default {
    uploadFiles,
};
