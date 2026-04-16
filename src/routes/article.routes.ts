import { Router } from 'express';
import articleController from '@src/controllers/article.controller';
import { validateDto } from '@src/middleware/validatation.middleware';
import {
    GetArticleByIdDto,
    GetArticleBySlugDto,
    getArticlesByCategoryDto,
    getArticlesByCategoryQueryDto,
    getArticlesDto,
    getFeaturedArticlesDto,
    getMostViewedArticlesDto,
    getRelatedArticlesDto,
    CreateArticleDto,
    UpdateArticleDto,
    DeleteArticleDto,
    UploadImageCreateArticleDto,
    UploadImageUpdateArticleDto,
} from '@src/dtos/article.dto';
import asyncHandler from '@src/helpers/asyncHandler';
import { authenticateToken, checkRole } from '@src/middleware/auth.middleware';
import upload from '@src/config/multer';

const router = Router();

/**
 * @swagger
 * /api/v1/articles:
 *   get:
 *     summary: Get all articles
 *     description: Retrieve all published articles with pagination, filtering, and search capabilities
 *     tags:
 *       - Articles
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: number
 *           default: 1
 *           minimum: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *           minimum: 1
 *         description: Number of articles per page
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [title, createdAt, updatedAt, viewCount, publishedAt]
 *           default: createdAt
 *         description: Sort field
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term for title and content
 *       - in: query
 *         name: categoryId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by category ID
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [draft, pending_review, published, rejected]
 *         description: Filter by article status
 *     responses:
 *       200:
 *         description: Articles retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Articles retrieved successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             format: uuid
 *                           title:
 *                             type: string
 *                           slug:
 *                             type: string
 *                           summary:
 *                             type: string
 *                           imageUrl:
 *                             type: string
 *                           viewCount:
 *                             type: integer
 *                           publishedAt:
 *                             type: string
 *                             format: date-time
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *                           status:
 *                             type: string
 *                             enum: [draft, pending_review, published, rejected]
 *                           featured:
 *                             type: boolean
 *                           author:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: string
 *                                 format: uuid
 *                               username:
 *                                 type: string
 *                               email:
 *                                 type: string
 *                                 format: email
 *                               avatar:
 *                                 type: string
 *                               name:
 *                                 type: object
 *                                 properties:
 *                                   firstName:
 *                                     type: string
 *                                   lastName:
 *                                     type: string
 *                               role:
 *                                 type: object
 *                           category:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: string
 *                                 format: uuid
 *                               name:
 *                                 type: string
 *                               slug:
 *                                 type: string
 *                               description:
 *                                 type: string
 *                     metadata:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: integer
 *                         limit:
 *                           type: integer
 *                         totalItems:
 *                           type: integer
 *                         totalPages:
 *                           type: integer
 *                         hasNext:
 *                           type: boolean
 *                         hasPrev:
 *                           type: boolean
 *       400:
 *         description: Invalid query parameters
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Lỗi validate
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Internal server error
 *                 error:
 *                   type: string
 *                   example: INTERNAL_SERVER_ERROR
 */
router.get(
    '/',
    validateDto(getArticlesDto, 'query'),
    asyncHandler(articleController.getArticles as any)
);

/**
 * @swagger
 * /api/v1/articles/featured:
 *   get:
 *     summary: Get featured articles
 *     description: Retrieve featured articles based on view count with pagination and search
 *     tags:
 *       - Articles
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: string
 *           default: "1"
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: string
 *           default: "10"
 *         description: Number of articles per page
 *       - in: query
 *         name: categoryId
 *         schema:
 *           type: string
 *           format: uuid
 *           example: e7bc7eb5-d9d0-4b2c-b333-d71937a64818
 *           default: undefined
 *         description: Filter by category ID
 *       - in: query
 *         name: slug
 *         schema:
 *           type: string
 *           example: tim-mach
 *           default: undefined
 *         description: Filter by category slug
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [viewCount, createdAt, publishedAt, title]
 *           default: viewCount
 *         description: Sort field
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term for title and content
 *       - in: query
 *         name: featured
 *         schema:
 *           type: string
 *           enum: ["true", "false"]
 *         description: Filter by featured flag (default true)
 *       - in: query
 *         name: minViews
 *         schema:
 *           type: string
 *           default: "1"
 *         description: Minimum view count threshold
 *     responses:
 *       200:
 *         description: Featured articles retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Featured articles retrieved successfully
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       title:
 *                         type: string
 *                       slug:
 *                         type: string
 *                       summary:
 *                         type: string
 *                       imageUrl:
 *                         type: string
 *                       viewCount:
 *                         type: integer
 *                       publishedAt:
 *                         type: string
 *                       author:
 *                         type: object
 *                       category:
 *                         type: object
 *                 metadata:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     totalItems:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *                     hasNext:
 *                       type: boolean
 *                     hasPrev:
 *                       type: boolean
 *       404:
 *         description: No featured articles found
 *       500:
 *         description: Internal server error
 */
router.get(
    '/featured',
    validateDto(getFeaturedArticlesDto, 'query'),
    asyncHandler(articleController.getFeaturedArticles as any)
);

/**
 * @swagger
 * /api/v1/articles/latest-by-categories:
 *   get:
 *     summary: Get latest articles from all categories
 *     description: Retrieve the latest published article from each category with pagination
 *     tags:
 *       - Articles
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: string
 *           default: "1"
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: string
 *           default: "10"
 *         description: Number of categories per page
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [name, createdAt, updatedAt]
 *           default: name
 *         description: Sort field
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: asc
 *         description: Sort order
 *     responses:
 *       200:
 *         description: Latest articles by categories retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Latest articles by all categories retrieved successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           name:
 *                             type: string
 *                           slug:
 *                             type: string
 *                           description:
 *                             type: string
 *                           _count:
 *                             type: object
 *                             properties:
 *                               articles:
 *                                 type: integer
 *                           latestArticle:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: string
 *                               title:
 *                                 type: string
 *                               slug:
 *                                 type: string
 *                               summary:
 *                                 type: string
 *                               imageUrl:
 *                                 type: string
 *                               viewCount:
 *                                 type: integer
 *                               publishedAt:
 *                                 type: string
 *                               author:
 *                                 type: object
 *                     metadata:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: integer
 *                         limit:
 *                           type: integer
 *                         totalItems:
 *                           type: integer
 *                         totalPages:
 *                           type: integer
 *                         hasNext:
 *                           type: boolean
 *                         hasPrev:
 *                           type: boolean
 *       404:
 *         description: No latest articles found
 *       500:
 *         description: Internal server error
 */
router.get(
    '/latest-by-categories',
    validateDto(getArticlesByCategoryQueryDto, 'query'),
    asyncHandler(articleController.getLatestArticlesByAllCategories as any)
);

/**
 * @swagger
 * /api/v1/articles/most-viewed-by-categories:
 *   get:
 *     summary: Get most viewed article from each category
 *     description: Retrieve the most viewed published article for each category with pagination
 *     tags:
 *       - Articles
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: string
 *           default: "1"
 *         description: Page number (categories)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: string
 *           default: "10"
 *         description: Number of categories per page
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [name, createdAt, updatedAt]
 *           default: name
 *         description: Sort categories by field
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: asc
 *         description: Sort order for categories
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term for category name/description
 *       - in: query
 *         name: minViews
 *         schema:
 *           type: string
 *           default: "0"
 *         description: Minimum view count for candidate articles
 *     responses:
 *       200:
 *         description: Most viewed articles by categories retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Most viewed articles by all categories retrieved successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           name:
 *                             type: string
 *                           slug:
 *                             type: string
 *                           description:
 *                             type: string
 *                           _count:
 *                             type: object
 *                             properties:
 *                               articles:
 *                                 type: integer
 *                           mostViewedArticle:
 *                             type: object
 *                             nullable: true
 *                             properties:
 *                               id:
 *                                 type: string
 *                               title:
 *                                 type: string
 *                               slug:
 *                                 type: string
 *                               summary:
 *                                 type: string
 *                               imageUrl:
 *                                 type: string
 *                               viewCount:
 *                                 type: integer
 *                               publishedAt:
 *                                 type: string
 *                               author:
 *                                 type: object
 *                     metadata:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: integer
 *                         limit:
 *                           type: integer
 *                         totalItems:
 *                           type: integer
 *                         totalPages:
 *                           type: integer
 *                         hasNext:
 *                           type: boolean
 *                         hasPrev:
 *                           type: boolean
 *       404:
 *         description: No most viewed articles found
 *       500:
 *         description: Internal server error
 */
router.get(
    '/most-viewed-by-categories',
    validateDto(getMostViewedArticlesDto, 'query'),
    asyncHandler(articleController.getMostViewedArticlesByAllCategory as any)
);

/**
 * @swagger
 * /api/v1/articles/related:
 *   get:
 *     summary: Get related articles
 *     description: Retrieve published articles related to a specific article based on category with pagination
 *     tags:
 *       - Articles
 *     parameters:
 *       - in: query
 *         name: articleId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *           example: 123e4567-e89b-12d3-a456-426614174000
 *         description: Article ID to find related articles
 *       - in: query
 *         name: page
 *         schema:
 *           type: number
 *           default: 1
 *           minimum: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *           minimum: 1
 *           maximum: 100
 *         description: Number of articles per page (max 100)
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [name, createdAt, updatedAt]
 *           default: createdAt
 *         description: Sort field
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order
 *     responses:
 *       200:
 *         description: Related articles retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Related articles retrieved successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             format: uuid
 *                           title:
 *                             type: string
 *                           slug:
 *                             type: string
 *                           summary:
 *                             type: string
 *                           imageUrl:
 *                             type: string
 *                           viewCount:
 *                             type: integer
 *                           publishedAt:
 *                             type: string
 *                             format: date-time
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *                           author:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: string
 *                                 format: uuid
 *                               username:
 *                                 type: string
 *                               email:
 *                                 type: string
 *                                 format: email
 *                               avatar:
 *                                 type: string
 *                               name:
 *                                 type: object
 *                                 properties:
 *                                   firstName:
 *                                     type: string
 *                                   lastName:
 *                                     type: string
 *                               role:
 *                                 type: object
 *                           category:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: string
 *                                 format: uuid
 *                               name:
 *                                 type: string
 *                               slug:
 *                                 type: string
 *                               description:
 *                                 type: string
 *                     metadata:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: integer
 *                         limit:
 *                           type: integer
 *                         totalItems:
 *                           type: integer
 *                         totalPages:
 *                           type: integer
 *                         hasNext:
 *                           type: boolean
 *                         hasPrev:
 *                           type: boolean
 *       400:
 *         description: Invalid article ID format
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Lỗi validate
 *                 errors:
 *                   schema:
 *                     $ref: '#/components/schemas/ValidationErrors'
 *                   example:
 *                     - field: articleId
 *                       message: Article ID không hợp lệ
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Internal server error
 *                 error:
 *                   type: string
 *                   example: INTERNAL_SERVER_ERROR
 */
router.get(
    '/related',
    validateDto(getRelatedArticlesDto, 'query'),
    asyncHandler(articleController.getRelatedArticles as any)
);

/**
 * @swagger
 * /api/v1/articles/{id}:
 *   get:
 *     summary: Get article by ID
 *     description: Retrieve a single article by its ID and increment view count
 *     tags:
 *       - Articles
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *           example: 123e4567-e89b-12d3-a456-426614174000
 *         description: Article ID
 *     responses:
 *       200:
 *         description: Article retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Article retrieved successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                       example: 123e4567-e89b-12d3-a456-426614174000
 *                     title:
 *                       type: string
 *                       example: Tips for a Healthy Lifestyle
 *                     content:
 *                       type: string
 *                       example: Detailed article content...
 *                     summary:
 *                       type: string
 *                       example: A brief summary of the article
 *                     slug:
 *                       type: string
 *                       example: tips-for-healthy-lifestyle
 *                     imageUrl:
 *                       type: string
 *                       format: uri
 *                       example: https://example.com/image.jpg
 *                     viewCount:
 *                       type: integer
 *                       example: 150
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                       example: 2025-10-01T10:00:00.000Z
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *                       example: 2025-10-05T10:00:00.000Z
 *                     publishedAt:
 *                       type: string
 *                       format: date-time
 *                       example: 2025-10-01T12:00:00.000Z
 *                     status:
 *                       type: string
 *                       enum: [draft, pending_review, published, rejected]
 *                       example: published
 *                     featured:
 *                       type: boolean
 *                       example: false
 *                     author:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           format: uuid
 *                         username:
 *                           type: string
 *                           example: doctor_john
 *                         email:
 *                           type: string
 *                           format: email
 *                           example: john@hospital.com
 *                         avatar:
 *                           type: string
 *                           format: uri
 *                         name:
 *                           type: object
 *                           properties:
 *                             firstName:
 *                               type: string
 *                               example: John
 *                             lastName:
 *                               type: string
 *                               example: Doe
 *                         role:
 *                           type: object
 *                           properties:
 *                             id:
 *                               type: integer
 *                               example: 2
 *                             name:
 *                               type: string
 *                               example: doctor
 *                             prefix:
 *                               type: string
 *                               example: BS.
 *                     category:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           format: uuid
 *                         name:
 *                           type: string
 *                           example: Health Tips
 *                         slug:
 *                           type: string
 *                           example: health-tips
 *                         description:
 *                           type: string
 *                           example: Tips for maintaining good health
 *                         parent:
 *                           type: object
 *                           properties:
 *                             id:
 *                               type: string
 *                               format: uuid
 *                             name:
 *                               type: string
 *                               example: Medical
 *                             slug:
 *                               type: string
 *                               example: medical
 *       404:
 *         description: Article not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Article not found
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Internal server error
 *                 error:
 *                   type: string
 *                   example: INTERNAL_SERVER_ERROR
 */
router.get(
    '/:id',
    validateDto(GetArticleByIdDto, 'params'),
    asyncHandler(articleController.getArticleById)
);

/**
 * @swagger
 * /api/v1/articles/slug/{slug}:
 *   get:
 *     summary: Get article by slug
 *     description: Retrieve a single article by its slug and increment view count
 *     tags:
 *       - Articles
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *           example: tips-for-healthy-lifestyle
 *         description: Article slug
 *     responses:
 *       200:
 *         description: Article retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Article retrieved successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                       example: 123e4567-e89b-12d3-a456-426614174000
 *                     title:
 *                       type: string
 *                       example: Tips for a Healthy Lifestyle
 *                     content:
 *                       type: string
 *                       example: Detailed article content...
 *                     summary:
 *                       type: string
 *                       example: A brief summary of the article
 *                     slug:
 *                       type: string
 *                       example: tips-for-healthy-lifestyle
 *                     imageUrl:
 *                       type: string
 *                       format: uri
 *                       example: https://example.com/image.jpg
 *                     viewCount:
 *                       type: integer
 *                       example: 150
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *                     publishedAt:
 *                       type: string
 *                       format: date-time
 *                     status:
 *                       type: string
 *                       enum: [draft, pending_review, published, rejected]
 *                       example: published
 *                     featured:
 *                       type: boolean
 *                       example: false
 *                     author:
 *                       $ref: '#/components/schemas/User'
 *                     category:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           format: uuid
 *                         name:
 *                           type: string
 *                           example: Health Tips
 *                         slug:
 *                           type: string
 *                           example: health-tips
 *                         description:
 *                           type: string
 *                         parent:
 *                           type: object
 *       404:
 *         description: Article not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Article not found
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Internal server error
 *                 error:
 *                   type: string
 *                   example: INTERNAL_SERVER_ERROR
 */
router.get(
    '/slug/:slug',
    validateDto(GetArticleBySlugDto, 'params'),
    asyncHandler(articleController.getArticleBySlug)
);

/**
 * @swagger
 * /api/v1/articles/category/{categoryId}:
 *   get:
 *     summary: Get articles by category
 *     description: Retrieve published articles from a specific category with pagination
 *     tags:
 *       - Articles
 *     parameters:
 *       - in: path
 *         name: categoryId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Category ID
 *       - in: query
 *         name: page
 *         schema:
 *           type: string
 *           default: "1"
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: string
 *           default: "10"
 *         description: Number of articles per page
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [viewCount, createdAt, publishedAt, title]
 *           default: createdAt
 *         description: Sort field
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term for title and summary
 *     responses:
 *       200:
 *         description: Articles by category retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Articles by category retrieved successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           title:
 *                             type: string
 *                           slug:
 *                             type: string
 *                           summary:
 *                             type: string
 *                           imageUrl:
 *                             type: string
 *                           viewCount:
 *                             type: integer
 *                           publishedAt:
 *                             type: string
 *                           createdAt:
 *                             type: string
 *                           author:
 *                             type: object
 *                           category:
 *                             type: object
 *                     metadata:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: integer
 *                         limit:
 *                           type: integer
 *                         totalItems:
 *                           type: integer
 *                         totalPages:
 *                           type: integer
 *                         hasNext:
 *                           type: boolean
 *                         hasPrev:
 *                           type: boolean
 *       404:
 *         description: No articles found in this category
 *       500:
 *         description: Internal server error
 */
router.get(
    '/category/:categoryId',
    validateDto(getArticlesByCategoryDto, 'params'),
    validateDto(getArticlesByCategoryQueryDto, 'query'),
    asyncHandler(articleController.getArticlesByCategory)
);

/**
 * @swagger
 * /api/v1/articles:
 *   post:
 *     summary: Create a new article
 *     description: |
 *       Create a new health article with file upload support (Admin and Doctor only).
 *
 *       **File Upload Requirements:**
 *       - `thumbnail`: Required - 1 image file for article thumbnail
 *       - `images`: Optional - Maximum 10 image files for article content
 *
 *       **Process:**
 *       1. Validates uploaded files (thumbnail required, images max 10)
 *       2. Uploads all files to Cloudinary with preset 'health_articles'
 *       3. Automatically generates unique slug from title
 *       4. Creates article in database with uploaded image URLs
 *
 *       **Note:** Use `multipart/form-data` content type for file uploads.
 *     tags:
 *       - Articles
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - content
 *               - categoryId
 *               - thumbnail
 *             properties:
 *               thumbnail:
 *                 type: string
 *                 format: binary
 *                 description: Article thumbnail image (REQUIRED)
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Danh sách URL ảnh được dùng cho bài viết (bắt buộc nếu có ảnh)
 *               deletedImages:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Danh sách URL ảnh cần xóa khỏi Cloudinary (nếu có)
 *               title:
 *                 type: string
 *                 minLength: 3
 *                 description: Article title (min 3 characters)
 *                 example: Tips for a Healthy Lifestyle
 *               content:
 *                 type: string
 *                 minLength: 10
 *                 description: Article content (min 10 characters)
 *                 example: Detailed article content with health tips...
 *               summary:
 *                 type: string
 *                 description: Brief summary of the article
 *                 example: A comprehensive guide to maintaining healthy habits
 *               categoryId:
 *                 type: string
 *                 format: uuid
 *                 description: Category ID
 *                 example: 123e4567-e89b-12d3-a456-426614174000
 *               status:
 *                 type: string
 *                 enum: [draft, pending_review, published, rejected]
 *                 default: draft
 *                 description: Article status
 *               featured:
 *                 type: boolean
 *                 default: false
 *                 description: Whether article is featured
 *               extras:
 *                 type: object
 *                 description: Additional metadata (JSON object)
 *               toc:
 *                 type: object
 *                 description: Table of contents (JSON object)
 *     responses:
 *       200:
 *         description: Article created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Article created successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     title:
 *                       type: string
 *                     slug:
 *                       type: string
 *                     content:
 *                       type: string
 *                     summary:
 *                       type: string
 *                     imageUrl:
 *                       type: string
 *                       description: Cloudinary URL of uploaded thumbnail
 *                     images:
 *                       type: array
 *                       items:
 *                         type: string
 *                       description: Danh sách URL ảnh được dùng cho bài viết
 *                     deletedImages:
 *                       type: array
 *                       items:
 *                         type: string
 *                       description: Danh sách URL ảnh đã xóa khỏi Cloudinary
 *                     status:
 *                       type: string
 *                     featured:
 *                       type: boolean
 *                     categoryId:
 *                       type: string
 *                     authorId:
 *                       type: string
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Validation error
 *                 errors:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       field:
 *                         type: string
 *                       message:
 *                         type: string
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       403:
 *         description: Forbidden - User role not authorized (requires Admin or Doctor)
 *       404:
 *         description: Category not found
 *       500:
 *         description: Internal server error (e.g., Cloudinary upload failed)
 */
router.post(
    '/',
    authenticateToken(),
    checkRole(['admin', 'doctor']),
    upload.fields([
        {
            name: 'thumbnail',
            maxCount: 1,
        },
        {
            name: 'images',
            maxCount: 10,
        },
    ]),
    validateDto(UploadImageCreateArticleDto, 'files'),
    validateDto(CreateArticleDto, 'body'),
    asyncHandler(articleController.createArticle)
);

/**
 * @swagger
 * /api/v1/articles/{id}:
 *   patch:
 *     summary: Update an article
 *     description: |
 *       Update an existing article with smart image management (Admin or article author only).
 *
 *       **IMPORTANT: Field Names Clarification**
 *       This API separates FILE uploads and URL strings into different field names:
 *
 *       **FILE FIELDS (from req.files) - OPTIONAL:**
 *       - `newThumbnail`: New thumbnail file to upload (optional, max 1 file)
 *       - `newImages`: New image files to upload (optional, max 10 files)
 *
 *       **BODY FIELDS (from req.body) - OPTIONAL:**
 *       - `thumbnail`: String URL of current thumbnail to keep (optional)
 *       - `images`: Array of string URLs of current images to keep (optional)
 *
 *       **Update Logic:**
 *
 *       **Thumbnail Management:**
 *       - If `newThumbnail` FILE provided → Upload new + delete old (parallel)
 *       - If no `newThumbnail` FILE → Keep existing thumbnail unchanged
 *       - `thumbnail` field (string) is ignored when updating
 *
 *       **Images Management:**
 *       - `images` (body array): URLs to KEEP from existing images
 *       - `newImages` (files): NEW files to upload and add
 *       - Auto-delete: Images in DB but NOT in `images` array
 *       - Optimization: Upload + delete operations run in parallel (Promise.all)
 *       - Final result: kept URLs + newly uploaded URLs
 *
 *       **Example Scenario:**
 *       ```
 *       Current DB: [img1.jpg, img2.jpg, img3.jpg]
 *       Body images: [img1.jpg, img3.jpg]          ← URLs to keep
 *       File newImages: [new1.jpg, new2.jpg]       ← New files to upload
 *       → Delete: img2.jpg                         ← Not in body array
 *       → Upload: new1.jpg, new2.jpg               ← New files
 *       → Final: [img1.jpg, img3.jpg, new1.jpg, new2.jpg]
 *       ```
 *
 *       **Important Notes:**
 *       - All file fields are optional - you can update text fields without touching images
 *       - If `images` array is empty/omitted, all existing images will be deleted
 *       - Send `images` array with current URLs to keep them when uploading new ones
 *     tags:
 *       - Articles
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Article ID
 *         example: 123e4567-e89b-12d3-a456-426614174000
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               newThumbnail:
 *                 type: string
 *                 format: binary
 *                 description: '[FILE] New thumbnail image file to upload (OPTIONAL)'
 *               newImages:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 maxItems: 10
 *                 description: '[FILES] New image files to upload - max 10 files (OPTIONAL)'
 *               thumbnail:
 *                 type: string
 *                 description: '[BODY] Current thumbnail URL to keep (OPTIONAL)'
 *                 example: 'https://res.cloudinary.com/demo/image/upload/v1234/thumb.jpg'
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Danh sách URL ảnh được dùng cho bài viết (bắt buộc nếu có ảnh)
 *               deletedImages:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Danh sách URL ảnh cần xóa khỏi Cloudinary (nếu có)
 *               title:
 *                 type: string
 *                 minLength: 3
 *                 description: Updated article title
 *                 example: Updated Tips for Healthy Living
 *               content:
 *                 type: string
 *                 minLength: 10
 *                 description: Updated article content
 *               summary:
 *                 type: string
 *                 description: Updated article summary
 *               categoryId:
 *                 type: string
 *                 format: uuid
 *                 description: Updated category ID
 *               status:
 *                 type: string
 *                 enum: [draft, pending_review, published, rejected]
 *                 description: Updated article status
 *               featured:
 *                 type: boolean
 *                 description: Updated featured flag
 *               extras:
 *                 type: object
 *                 description: Updated additional metadata (JSON object)
 *               toc:
 *                 type: object
 *                 description: Updated table of contents (JSON object)
 *     responses:
 *       200:
 *         description: Article updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Article updated successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     title:
 *                       type: string
 *                     slug:
 *                       type: string
 *                     content:
 *                       type: string
 *                     imageUrl:
 *                       type: string
 *                       description: Updated thumbnail URL (if newThumbnail provided) or unchanged
 *                     images:
 *                       type: array
 *                       items:
 *                         type: string
 *                       description: Danh sách URL ảnh được dùng cho bài viết
 *                     deletedImages:
 *                       type: array
 *                       items:
 *                         type: string
 *                       description: Danh sách URL ảnh đã xóa khỏi Cloudinary
 *                     status:
 *                       type: string
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       403:
 *         description: Forbidden - User is not Admin or article author
 *       404:
 *         description: Article or Category not found
 *       500:
 *         description: Internal server error (e.g., Cloudinary upload/delete failed)
 */
router.patch(
    '/:id',
    authenticateToken(),
    checkRole(['admin', 'doctor']),
    upload.fields([
        {
            name: 'newThumbnail',
            maxCount: 1,
        },
        {
            name: 'newImages',
            maxCount: 10,
        },
    ]),
    validateDto(DeleteArticleDto, 'params'),
    validateDto(UpdateArticleDto, 'body'),
    validateDto(UploadImageUpdateArticleDto, 'files'),
    asyncHandler(articleController.updateArticle)
);

/**
 * @swagger
 * /api/v1/articles/{id}:
 *   delete:
 *     summary: Delete an article
 *     description: Delete an article (Admin or article author only)
 *     tags:
 *       - Articles
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Article ID
 *     responses:
 *       200:
 *         description: Article deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - insufficient permissions
 *       404:
 *         description: Article not found
 */
router.delete(
    '/:id',
    authenticateToken(),
    checkRole(['admin', 'doctor']),
    validateDto(DeleteArticleDto, 'params'),
    asyncHandler(articleController.deleteArticle)
);

router.post(
    '/send-for-review/:id',
    authenticateToken(),
    checkRole(['admin', 'doctor']),
    asyncHandler(articleController.sendArticleForReview as any)
);

/**
 * @swagger
 * /api/v1/articles/send-for-review/{id}:
 *   post:
 *     summary: Send an article for review
 *     description: |
 *       Send an article to the review queue. Only Admins and Doctors can perform this action.
 *     tags:
 *       - Articles
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Article ID
 *     responses:
 *       200:
 *         description: Article sent for review successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Article sent for review successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     status:
 *                       type: string
 *                       example: pending_review
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       403:
 *         description: Forbidden - User not allowed to perform this action
 *       404:
 *         description: Article not found
 *       500:
 *         description: Internal server error
 */

router.post(
    '/reject-review/:id',
    authenticateToken(),
    checkRole(['admin']),
    asyncHandler(articleController.rejectArticleReview as any)
);

/**
 * @swagger
 * /api/v1/articles/reject-review/{id}:
 *   post:
 *     summary: Reject an article review
 *     description: |
 *       Reject an article that is in review. Only Admins can reject an article's review and must provide a reason.
 *     tags:
 *       - Articles
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Article ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - reason
 *             properties:
 *               reason:
 *                 type: string
 *                 description: Reason for rejection
 *                 example: The article contains inaccurate medical information.
 *     responses:
 *       200:
 *         description: Article review rejected successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Article review rejected successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     status:
 *                       type: string
 *                       example: rejected
 *       400:
 *         description: Validation error (missing reason or invalid body)
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       403:
 *         description: Forbidden - User is not Admin
 *       404:
 *         description: Article not found
 *       500:
 *         description: Internal server error
 */

router.post(
    '/approve-review/:id',
    authenticateToken(),
    checkRole(['admin']),
    asyncHandler(articleController.approvalArticleReview as any)
);

/**
 * @swagger
 * /api/v1/articles/approve-review/{id}:
 *   post:
 *     summary: Approve an article review
 *     description: |
 *       Approve an article that is in review and publish it (or mark as approved). Only Admins can approve article reviews.
 *     tags:
 *       - Articles
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Article ID
 *     responses:
 *       200:
 *         description: Article review approved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Article review approved successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     status:
 *                       type: string
 *                       example: published
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       403:
 *         description: Forbidden - User is not Admin
 *       404:
 *         description: Article not found
 *       500:
 *         description: Internal server error
 */

router.post(
    '/request-edit/:id',
    authenticateToken(),
    checkRole(['admin']),
    asyncHandler(articleController.requestEditArticle as any)
);

/**
 * @swagger
 * /api/v1/articles/request-edit/{id}:
 *   post:
 *     summary: Request an edit for an article
 *     description: |
 *       Request an edit for an article and assign it to a specific assignee. Only Admins can request edits and must provide an assignee user ID.
 *     tags:
 *       - Articles
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Article ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - assigneeId
 *             properties:
 *               assigneeId:
 *                 type: string
 *                 format: uuid
 *                 description: User ID to assign the requested edit to
 *                 example: 123e4567-e89b-12d3-a456-426614174000
 *     responses:
 *       200:
 *         description: Article edit requested successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Article edit requested successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     assigneeId:
 *                       type: string
 *                       format: uuid
 *       400:
 *         description: Validation error (missing or invalid assigneeId)
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       403:
 *         description: Forbidden - User is not Admin
 *       404:
 *         description: Article or assignee not found
 *       500:
 *         description: Internal server error
 */

export default router;
