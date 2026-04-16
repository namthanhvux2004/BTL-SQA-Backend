import { Request, Response } from 'express';
import {
    GetArticleByIdDataDto,
    GetArticleBySlugDataDto,
    GetArticlesByCategoryDataDto,
    GetArticlesByCategoryQueryDataDto,
    GetArticlesDataDto,
    GetFeaturedArticlesDataDto,
    GetMostViewedArticlesDataDto,
    GetRelatedArticlesDataDto,
    CreateArticleDataDto,
    UpdateArticleDataDto,
    DeleteArticleDataDto,
} from '@src/dtos/article.dto';
import articleService from '@src/services/article.service';
import { SuccessResponse } from '@src/core/ApiResponse';
import { TokenPayload } from '@src/middleware/auth.middleware';

const getArticleById = async (req: Request, res: Response) => {
    const { id } = req.params as GetArticleByIdDataDto;
    const result = await articleService.getArticleById(id);
    return new SuccessResponse(result, 'Article retrieved successfully').send(
        res
    );
};

const getArticleBySlug = async (req: Request, res: Response) => {
    const { slug } = req.params as GetArticleBySlugDataDto;
    const result = await articleService.getArticleBySlug(slug);
    return new SuccessResponse(result, 'Article retrieved successfully').send(
        res
    );
};

const getFeaturedArticles = async (
    req: Request<{}, {}, {}, GetFeaturedArticlesDataDto>,
    res: Response<SuccessResponse<any>>
) => {
    const query = req.query;
    const { data, metadata } = await articleService.getFeaturedArticles(query);
    return new SuccessResponse(
        data,
        'Featured articles retrieved successfully',
        metadata
    ).send(res);
};

const getLatestArticlesByAllCategories = async (
    req: Request<{}, {}, {}, GetArticlesByCategoryQueryDataDto>,
    res: Response
) => {
    const query = req.query;
    const result = await articleService.getLatestArticlesByAllCategories(query);
    return new SuccessResponse(
        result,
        'Latest articles by all categories retrieved successfully'
    ).send(res);
};

const getArticlesByCategory = async (req: Request, res: Response) => {
    const { categoryId } = req.params as GetArticlesByCategoryDataDto;
    const query = req.query as GetArticlesByCategoryQueryDataDto;
    const result = await articleService.getArticlesByCategory(
        categoryId,
        query
    );
    return new SuccessResponse(
        result,
        'Articles by category retrieved successfully'
    ).send(res);
};

// Lấy bài viết xem nhiều nhất của tất cả chuyên mục
const getMostViewedArticlesByAllCategory = async (
    req: Request<{}, {}, {}, GetMostViewedArticlesDataDto>,
    res: Response
) => {
    const query = req.query;
    const result =
        await articleService.getMostViewedArticlesByAllCategories(query);
    return new SuccessResponse(
        result,
        'Most viewed articles by category retrieved successfully'
    ).send(res);
};

// Lấy các bài viết liên quan theo chuyên mục
const getRelatedArticles = async (
    req: Request<{}, {}, {}, GetRelatedArticlesDataDto>,
    res: Response
) => {
    const query = req.query;
    const result = await articleService.getRelatedArticles(query);
    return new SuccessResponse(
        result.data,
        'Related articles retrieved successfully',
        result.metadata
    ).send(res);
};

// Lấy danh sách bài viết
const getArticles = async (
    req: Request<{}, {}, {}, GetArticlesDataDto>,
    res: Response
) => {
    const query = req.query;
    const result = await articleService.getArticles(query);
    return new SuccessResponse(
        result.data,
        'Articles retrieved successfully',
        result.metadata
    ).send(res);
};

// Tạo bài viết mới
const createArticle = async (req: Request, res: Response) => {
    const user = req.user as TokenPayload;
    const data = req.body as CreateArticleDataDto;
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    const result = await articleService.createNewArticle(data, user.id, files);
    return new SuccessResponse(result, 'Article created successfully').send(
        res
    );
};

// Cập nhật bài viết
const updateArticle = async (req: Request, res: Response) => {
    const user = req.user as TokenPayload;
    const { id } = req.params as DeleteArticleDataDto;
    const data = req.body as UpdateArticleDataDto;
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };

    const result = await articleService.updateExistingArticle(
        id,
        data,
        user.id,
        user.role,
        files
    );
    return new SuccessResponse(result, 'Article updated successfully').send(
        res
    );
};

// Xóa bài viết
const deleteArticle = async (req: Request, res: Response) => {
    const user = req.user as TokenPayload;
    const { id } = req.params as DeleteArticleDataDto;
    const result = await articleService.deleteExistingArticle(
        id,
        user.id,
        user.role
    );
    return new SuccessResponse(result, 'Article deleted successfully').send(
        res
    );
};

// Gửi kiểm duyệt bài viết
const sendArticleForReview = async (
    req: Request<{ id: string }, {}, { id: string }>,
    res: Response
) => {
    const user = req.user;
    const { id } = req.params;
    const result = await articleService.sendArticleForReview(id, user!.id);
    return new SuccessResponse(
        result,
        'Article sent for review successfully'
    ).send(res);
};

// Từ chối duyệt bài

const rejectArticleReview = async (
    req: Request<{ id: string }, {}, { reason: string }>,
    res: Response
) => {
    const { id: articleId } = req.params;
    const { reason: rejectionReason } = req.body;
    const result = await articleService.rejectArticleReview(
        articleId,
        rejectionReason
    );
    return new SuccessResponse(
        result,
        'Article review rejected successfully'
    ).send(res);
};

const approvalArticleReview = async (
    req: Request<{ id: string }>,
    res: Response
) => {
    const { id } = req.params;
    const result = await articleService.approvalArticleReview(id);
    return new SuccessResponse(
        result,
        'Article review approved successfully'
    ).send(res);
};

const requestEditArticle = async (
    req: Request<{ id: string }, {}, { assigneeId: string }>,
    res: Response
) => {
    const { id: articleId } = req.params;
    const { assigneeId } = req.body;
    const result = await articleService.requestEditArticle(
        articleId,
        assigneeId
    );
    return new SuccessResponse(
        result,
        'Article edit requested successfully'
    ).send(res);
};

export default {
    getArticleById,
    getArticleBySlug,
    getFeaturedArticles,
    getLatestArticlesByAllCategories,
    getArticlesByCategory,
    getMostViewedArticlesByAllCategory,
    getRelatedArticles,
    getArticles,
    createArticle,
    updateArticle,
    deleteArticle,
    sendArticleForReview,
    rejectArticleReview,
    approvalArticleReview,
    requestEditArticle,
};
