import { Router } from 'express';
import categoryController from '@src/controllers/category.controller';
import { validateDto as validate } from '@src/middleware/validatation.middleware';
import {
    AddCategoryDto,
    UpdateCategoryDto,
    GetCategoriesDto,
    GetCategoryByIdDto,
    GetCategoryBySlugDto,
} from '@src/dtos/category.dto';
import {
    authenticateToken as authenticate,
    checkRole as authorize,
} from '@src/middleware/auth.middleware';
import asyncHandler from '@src/helpers/asyncHandler';

const router = Router();

/**
 * @swagger
 * /api/v1/categories:
 *   post:
 *     summary: Create a new category
 *     tags: [Category]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AddCategoryDto'
 *     responses:
 *       '200':
 *         description: Category created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/Category'
 *       '400':
 *         description: Bad request
 *       '401':
 *         description: Unauthorized
 */
router.post(
    '/',
    authenticate(),
    authorize(['admin']),
    validate(AddCategoryDto),
    asyncHandler(categoryController.createCategory)
);

/**
 * @swagger
 * /api/v1/categories:
 *   get:
 *     summary: Get all categories
 *     tags: [Category]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: string
 *         default: '1'
 *       - in: query
 *         name: limit
 *         schema:
 *           type: string
 *         default: '10'
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [name, createdAt, updatedAt]
 *         default: 'name'
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *         default: 'asc'
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: parentId
 *         schema:
 *           type: string
 *           description: 'Filter by parent category ID, or "null" for root categories'
 *       - in: query
 *         name: includeChildren
 *         schema:
 *           type: boolean
 *           default: false
 *     responses:
 *       '200':
 *         description: Categories retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Category'
 *                 metadata:
 *                   $ref: '#/components/schemas/PaginationMetadata'
 */
router.get(
    '/',
    validate(GetCategoriesDto, 'query'),
    asyncHandler(categoryController.getCategories)
);

/**
 * @swagger
 * /api/v1/categories/{id}:
 *   get:
 *     summary: Get a category by ID
 *     tags: [Category]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       '200':
 *         description: Category retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/Category'
 *       '404':
 *         description: Category not found
 */
router.get(
    '/:id',
    validate(GetCategoryByIdDto, 'params'),
    asyncHandler(categoryController.getCategoryById)
);

/**
 * @swagger
 * /api/v1/categories/slug/{slug}:
 *   get:
 *     summary: Get a category by slug
 *     tags: [Category]
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       '200':
 *         description: Category retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/Category'
 *       '404':
 *         description: Category not found
 */
router.get(
    '/slug/:slug',
    validate(GetCategoryBySlugDto, 'params'),
    asyncHandler(categoryController.getCategoryBySlug)
);

/**
 * @swagger
 * /api/v1/categories/{id}:
 *   patch:
 *     summary: Update a category
 *     tags: [Category]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateCategoryDto'
 *     responses:
 *       '200':
 *         description: Category updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/Category'
 *       '400':
 *         description: Bad request
 *       '401':
 *         description: Unauthorized
 *       '404':
 *         description: Category not found
 */
router.patch(
    '/:id',
    authenticate(),
    authorize(['admin']),
    validate(GetCategoryByIdDto, 'params'),
    validate(UpdateCategoryDto.partial()),
    asyncHandler(categoryController.updateCategory)
);

/**
 * @swagger
 * /api/v1/categories/{id}:
 *   delete:
 *     summary: Delete a category
 *     tags: [Category]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       '200':
 *         description: Category deleted successfully
 *       '400':
 *         description: Bad request (e.g., category has children or articles)
 *       '401':
 *         description: Unauthorized
 *       '404':
 *         description: Category not found
 */
router.delete(
    '/:id',
    authenticate(),
    authorize(['admin']),
    validate(GetCategoryByIdDto, 'params'),
    asyncHandler(categoryController.deleteCategory)
);

export default router;
