import { CustomError, ErrorType } from '@src/core/Error';
import {
    createMedicalRecord as createMedicalRecordDao,
    updateMedicalRecord as updateMedicalRecordDao,
    deleteMedicalRecord as deleteMedicalRecordDao,
    findMedicalRecordById,
    getMedicalRecords,
} from '@src/daos/medical-record.dao';
import { findVisitById } from '@src/daos/visit.dao';
import {
    CreateMedicalRecordDataDto,
    UpdateMedicalRecordDataDto,
    GetMedicalRecordsQueryDataDto,
    validateFileUpload,
} from '@src/dtos/medical-record.dto';
import fileAssetDao from '@src/daos/fileAsset.dao';
import {
    uploadToCloudinary,
    deleteFromCloudinary,
} from '@src/services/cloudinary.service';

/**
 * Validate visit status before creating/updating medical record
 * @param visitId - Visit ID
 * @param doctorId - Doctor ID (optional, for checking doctor ownership)
 * @throws CustomError if visit is invalid
 */
const validateVisitForMedicalRecord = async (
    visitId: string,
    doctorId?: string
) => {
    const visit = await findVisitById(visitId);

    if (!visit) {
        throw new CustomError(ErrorType.NOT_FOUND, 'Visit not found');
    }

    // Check visit status
    if (visit.status === 'completed') {
        throw new CustomError(
            ErrorType.BAD_REQUEST,
            'Cannot create or modify medical record for completed visit'
        );
    }

    if (visit.status === 'cancelled') {
        throw new CustomError(
            ErrorType.BAD_REQUEST,
            'Cannot create or modify medical record for cancelled visit'
        );
    }

    // Check if doctor is assigned to this visit
    if (doctorId && visit.doctorId !== doctorId) {
        throw new CustomError(
            ErrorType.FORBIDDEN,
            'You are not the assigned doctor for this visit'
        );
    }

    return visit;
};

/**
 * Create a new medical record
 * @param doctorId - Doctor ID creating the record
 * @param data - Medical record data
 * @param files - Optional uploaded files
 * @returns Created medical record with file assets
 */
const createMedicalRecord = async (
    doctorId: string,
    data: CreateMedicalRecordDataDto,
    files?: Express.Multer.File[]
) => {
    // Validate visit
    await validateVisitForMedicalRecord(data.visitId, doctorId);

    // Validate files if provided
    if (files && files.length > 0) {
        for (const file of files) {
            const validation = validateFileUpload(file);
            if (!validation.valid) {
                throw new CustomError(
                    ErrorType.VALIDATION_ERROR,
                    validation.error!
                );
            }
        }
    }

    const uploadedFiles: Array<{ url: string; public_id: string }> = [];
    // Create medical record
    const medicalRecord = await createMedicalRecordDao(doctorId, data);

    // Upload and link files if provided
    if (files && files.length > 0) {
        const fileAssets = await Promise.all(
            files.map(async (file) => {
                // Upload file to Cloudinary
                const cloudinaryResult = await uploadToCloudinary(file.path, {
                    folder: 'healthsystem/medical-records',
                    autoDeleteLocalFile: true,
                });

                uploadedFiles.push(cloudinaryResult);

                // Save file asset with Cloudinary URL
                return fileAssetDao.createFileAsset({
                    entityId: medicalRecord.id,
                    entityType: 'medical_record',
                    fileType: file.mimetype,
                    isPrivate: true,
                    url: cloudinaryResult.url,
                    mimeType: file.mimetype,
                    name: file.originalname,
                    size: file.size,
                });
            })
        );

        return {
            ...medicalRecord,
            fileAssets: fileAssets,
        };
    }

    return {
        ...medicalRecord,
        fileAssets: [],
    };
};

/**
 * Get medical record by ID
 * @param id - Medical record ID
 * @param doctorId - Optional doctor ID for permission check
 * @returns Medical record with file assets
 */
const getMedicalRecordById = async (id: string, doctorId?: string) => {
    const medicalRecord = await findMedicalRecordById(id);

    if (!medicalRecord) {
        throw new CustomError(ErrorType.NOT_FOUND, 'Medical record not found');
    }

    // Optional: Check doctor permission
    if (doctorId && medicalRecord.doctorId !== doctorId) {
        throw new CustomError(
            ErrorType.FORBIDDEN,
            'You do not have permission to view this medical record'
        );
    }

    // Files already fetched in findMedicalRecordById
    return medicalRecord;
};

/**
 * Update medical record
 * @param id - Medical record ID
 * @param doctorId - Doctor ID updating the record
 * @param data - Updated medical record data
 * @param files - Optional new files to upload
 * @returns Updated medical record
 */
const updateMedicalRecord = async (
    id: string,
    doctorId: string,
    data: UpdateMedicalRecordDataDto,
    files?: Express.Multer.File[]
) => {
    // Check if medical record exists and doctor is owner
    const existingRecord = await findMedicalRecordById(id);
    if (!existingRecord) {
        throw new CustomError(ErrorType.NOT_FOUND, 'Medical record not found');
    }

    // const isOwner = await checkDoctorOwnership(id, doctorId);
    // if (!isOwner) {
    //     throw new CustomError(
    //         ErrorType.FORBIDDEN,
    //         'You do not have permission to update this medical record'
    //     );
    // }

    // Validate visit status
    await validateVisitForMedicalRecord(existingRecord.visitId);

    // Validate new files if provided
    if (files && files.length > 0) {
        for (const file of files) {
            const validation = validateFileUpload(file);
            if (!validation.valid) {
                throw new CustomError(
                    ErrorType.VALIDATION_ERROR,
                    validation.error!
                );
            }
        }
    }

    const uploadedFiles: Array<{ url: string; assetId?: string }> = [];

    try {
        // Update medical record
        const updatedRecord = await updateMedicalRecordDao(id, data);

        // Upload new files if provided
        if (files && files.length > 0) {
            const newFileAssets = await Promise.all(
                files.map(async (file) => {
                    // Upload file to Cloudinary
                    const cloudinaryResult = await uploadToCloudinary(
                        file.path,
                        {
                            folder: 'healthsystem/medical-records',
                            autoDeleteLocalFile: true,
                        }
                    );

                    // Save file asset with Cloudinary URL
                    const asset = await fileAssetDao.createFileAsset({
                        entityId: id,
                        entityType: 'medical_record',
                        isPrivate: true,
                        url: cloudinaryResult.url,
                        mimeType: file.mimetype,
                        fileType: file.mimetype,
                        name: file.originalname,
                        size: file.size,
                    });

                    uploadedFiles.push({
                        url: cloudinaryResult.url,
                        assetId: asset.id,
                    });
                    return asset;
                })
            );
        }

        // Get all files
        const allFiles = await fileAssetDao.getFileAssetsOfMedicalRecord(id);

        return {
            ...updatedRecord,
            fileAssets: allFiles,
        };
    } catch (error) {
        // Rollback: delete uploaded files from Cloudinary and database
        if (uploadedFiles.length > 0) {
            await Promise.allSettled([
                ...uploadedFiles.map((file) => deleteFromCloudinary(file.url)),
                ...uploadedFiles
                    .filter((f) => f.assetId)
                    .map((file) => fileAssetDao.deleteFileAsset(file.assetId!)),
            ]);
        }

        throw error;
    }
};

/**
 * Delete medical record
 * @param id - Medical record ID
 * @param doctorId - Doctor ID deleting the record
 * @returns Deletion result
 */
const deleteMedicalRecord = async (id: string, doctorId: string) => {
    // Check if medical record exists and doctor is owner
    const existingRecord = await findMedicalRecordById(id);
    if (!existingRecord) {
        throw new CustomError(ErrorType.NOT_FOUND, 'Medical record not found');
    }

    // const isOwner = await checkDoctorOwnership(id, doctorId);
    // if (!isOwner) {
    //     throw new CustomError(
    //         ErrorType.FORBIDDEN,
    //         'You do not have permission to delete this medical record'
    //     );
    // }

    // Get all associated files
    const fileAssets = await fileAssetDao.getFileAssetsOfMedicalRecord(id);

    // Delete files from Cloudinary and database
    await Promise.allSettled([
        ...fileAssets.map((file) => deleteFromCloudinary(file.url)),
        ...fileAssets.map((file) => fileAssetDao.deleteFileAsset(file.id)),
    ]);

    // Delete medical record
    await deleteMedicalRecordDao(id);

    return {
        success: true,
        message: 'Medical record deleted successfully',
    };
};

/**
 * Get list of medical records with pagination
 * @param query - Query parameters
 * @returns Paginated medical records
 */
const getMedicalRecordsList = async (query: GetMedicalRecordsQueryDataDto) => {
    const page = parseInt(query.page || '1');
    const limit = parseInt(query.limit || '10');

    return await getMedicalRecords({
        ...(query.visitId && { visitId: query.visitId }),
        ...(query.doctorId && { doctorId: query.doctorId }),
        page,
        limit,
        sortBy: query.sortBy || 'createdAt',
        sortOrder: query.sortOrder || 'desc',
    });
};

const deleteFileAsset = async (id: string) => {
    // Find file asset
    const fileAsset = await fileAssetDao.getFileAsset(id);
    if (!fileAsset) {
        throw new CustomError(ErrorType.NOT_FOUND, 'File asset not found');
    }

    // Check if doctor is owner of medical record
    // const isOwner = await checkDoctorOwnership(
    //     fileAsset.entityId,
    //     doctorId
    // );
    // if (!isOwner) {
    //     throw new CustomError(
    //         ErrorType.FORBIDDEN,
    //         'You do not have permission to delete this file asset'
    //     );
    // }

    // Delete file from Cloudinary and database
    await Promise.allSettled([
        deleteFromCloudinary(fileAsset.url),
        fileAssetDao.deleteFileAsset(id),
    ]);

    return {
        success: true,
        message: 'File asset deleted successfully',
    };
};

export default {
    createMedicalRecord,
    getMedicalRecordById,
    updateMedicalRecord,
    deleteMedicalRecord,
    getMedicalRecordsList,
    deleteFileAsset,
};
