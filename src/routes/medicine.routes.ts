import { Router } from 'express';
import medicineController from '@src/controllers/medicine.controller';
import asyncHandler from '@src/helpers/asyncHandler';

const router = Router();

/**
 * @swagger
 * /api/v1/medicines:
 *   get:
 *     summary: Lấy danh sách thuốc
 *     description: Lấy danh sách thuốc
 *     tags:
 *       - Medicines
 *     responses:
 *       200:
 *         description: Lấy danh sách thuốc thành công
 */
router.get('/', asyncHandler(medicineController.getMedicines as any));

export default router;
