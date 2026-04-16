import { CustomError, ErrorType } from '@src/core/Error';
import {
    findArticleById,
    findArticleBySlug,
    findFeaturedArticles,
    incrementViewCount,
    findArticlesByCategory,
    findLatestArticlesByAllCategory,
    findMostViewedArticlesByAllCategory,
    findRelatedArticles,
    findArticles,
    createArticle,
    updateArticle,
    deleteArticle,
    findArticleByIdForEdit,
    checkSlugExists,
} from '@src/daos/article.dao';
import {
    GetArticlesDataDto,
    GetFeaturedArticlesDataDto,
    GetRelatedArticlesDataDto,
    CreateArticleDataDto,
    UpdateArticleDataDto,
} from '@src/dtos/article.dto';
import slugify from 'slugify';
import { findCategoryById } from '@src/daos/category.dao';
import {
    uploadToCloudinary,
    deleteFromCloudinary,
} from '@src/services/cloudinary.service';
import { findUserById } from '@src/daos/auth.dao';

const getArticleById = async (id: string) => {
    const article = await findArticleById(id);

    if (!article) {
        throw new CustomError(ErrorType.NOT_FOUND, 'Article not found! (id)');
    }

    // Tăng view count khi xem bài viết
    await incrementViewCount(article.id);

    return article;
};

const getArticleBySlug = async (slug: string) => {
    const article = await findArticleBySlug(slug);

    if (!article) {
        throw new CustomError(ErrorType.NOT_FOUND, 'Article not found! (slug)');
    }

    // Tăng view count khi xem bài viết
    await incrementViewCount(article.id);

    return article;
};

const getFeaturedArticles = async (query: GetFeaturedArticlesDataDto) => {
    const result = await findFeaturedArticles(query);
    if (!result.data || result.data.length === 0) {
        throw new CustomError(
            ErrorType.NOT_FOUND,
            'No featured articles found'
        );
    }

    return result;
};

// Lấy bài viết mới nhất của tất cả chuyên mục
const getLatestArticlesByAllCategories = async (query: {
    page: string;
    limit: string;
    sortBy: 'name' | 'createdAt' | 'updatedAt';
    sortOrder: 'asc' | 'desc';
    search?: string | undefined;
}) => {
    const result = await findLatestArticlesByAllCategory(query);
    if (!result.data || result.data.length === 0) {
        throw new CustomError(ErrorType.NOT_FOUND, 'No latest articles found');
    }
    return result;
};

// Lấy tất cả bài viết theo chuyên mục
const getArticlesByCategory = async (
    categoryId: string,
    query: {
        page?: string;
        limit?: string;
        sortBy?: string;
        sortOrder?: 'asc' | 'desc';
        search?: string | undefined;
    }
) => {
    const result = await findArticlesByCategory(categoryId, query);
    if (!result.data || result.data.length === 0) {
        throw new CustomError(
            ErrorType.NOT_FOUND,
            'No articles found for this category'
        );
    }
    return result;
};

// Lấy bài viết xem nhiều nhất của tất cả các chuyên mục
const getMostViewedArticlesByAllCategories = async (query: {
    page: string;
    limit: string;
    sortBy: 'name' | 'createdAt' | 'updatedAt';
    sortOrder: 'asc' | 'desc';
    minViews: number;
    search?: string | undefined;
}) => {
    const result = await findMostViewedArticlesByAllCategory(query);
    if (!result.data || result.data.length === 0) {
        throw new CustomError(
            ErrorType.NOT_FOUND,
            'No most viewed articles found'
        );
    }
    return result;
};

// Lấy các bài viết liên quan tới 1 bài viết
const getRelatedArticles = async (query: GetRelatedArticlesDataDto) => {
    const result = await findRelatedArticles(query);
    return result;
};

// Lấy danh sách bài viết
const getArticles = async (query: GetArticlesDataDto) => {
    const result = await findArticles(query);
    return result;
};

// Tạo slug từ title
const generateUniqueSlug = async (
    title: string,
    excludeId?: string
): Promise<string> => {
    const baseSlug = slugify(title, {
        lower: true,
        strict: true,
        locale: 'vi',
    });

    let slug = baseSlug;
    let count = 1;

    while (await checkSlugExists(slug, excludeId)) {
        slug = `${baseSlug}-${count}`;
        count++;
    }

    return slug;
};

// Tạo bài viết mới
const createNewArticle = async (
    data: CreateArticleDataDto,
    authorId: string,
    files?: { [fieldname: string]: Express.Multer.File[] }
) => {
    const user = await findUserById(authorId);
    if (!user) {
        throw new CustomError(
            ErrorType.INTERNAL_ERROR,
            'Someting errors occurred'
        );
    }
    if (!['admin', 'doctor'].includes(user.role.name)) {
        throw new CustomError(
            ErrorType.FORBIDDEN,
            'You do not have permission to create articles'
        );
    }
    if (data.status === 'published' && user.role.name !== 'admin') {
        throw new CustomError(
            ErrorType.FORBIDDEN,
            'You do not have permission to publish articles'
        );
    }
    // Kiểm tra category tồn tại
    const category = await findCategoryById(data.categoryId);
    if (!category) {
        throw new CustomError(ErrorType.NOT_FOUND, 'Category not found');
    }

    // Tạo slug từ title
    const slug = await generateUniqueSlug(data.slug || data.title);

    // Upload thumbnail lên Cloudinary
    let thumbnailUrl: string | undefined;
    if (files?.thumbnail && files.thumbnail[0]) {
        const uploadResult = await uploadToCloudinary(files.thumbnail[0].path, {
            folder: 'healthsystem/articles/thumbnails',
        });
        thumbnailUrl = uploadResult.url;
    }

    // Upload các ảnh khác lên Cloudinary
    let imagesUrls: string[] = [];

    if (files?.images && files.images.length > 0) {
        const uploadPromises = files.images.map((file) =>
            uploadToCloudinary(file.path, {
                folder: 'healthsystem/articles/images',
            })
        );
        const uploadResults = await Promise.all(uploadPromises);
        imagesUrls = uploadResults.map((result) => result.url);
    }

    // Xóa ảnh đã từng được upload trong quá trình tạo bài viết mới

    const deletetedUploadImages = data.deletedImages || [];
    const deletePromises = deletetedUploadImages.map((url) =>
        deleteFromCloudinary(url)
    );
    await Promise.allSettled(deletePromises);

    // Chuẩn bị dữ liệu để tạo bài viết
    const articleData: any = {
        title: data.title,
        content: data.content,
        slug,
        authorId,
        categoryId: data.categoryId,
    };

    // Thêm các trường optional nếu có
    if (data.summary) articleData.summary = data.summary;
    if (thumbnailUrl) articleData.imageUrl = thumbnailUrl;
    articleData.images = data.imagesUrl || [];
    if (imagesUrls.length > 0) articleData.images.push(...imagesUrls);
    if (data.status) articleData.status = data.status;
    if (data.featured !== undefined) articleData.featured = data.featured;
    if (data.extras) articleData.extras = data.extras;
    if (data.toc) articleData.toc = data.toc;

    // Tạo bài viết
    const article = await createArticle(articleData);

    return article;
};

// Cập nhật bài viết
const updateExistingArticle = async (
    id: string,
    data: UpdateArticleDataDto,
    userId: string,
    userRole: string,
    files?: { [fieldname: string]: Express.Multer.File[] }
) => {
    const user = await findUserById(userId);
    if (!user) {
        throw new CustomError(
            ErrorType.INTERNAL_ERROR,
            'Someting errors occurred'
        );
    }
    if (!['admin', 'doctor'].includes(user.role.name)) {
        throw new CustomError(
            ErrorType.FORBIDDEN,
            'You do not have permission to update articles'
        );
    }
    if (data.status === 'published' && user.role.name !== 'admin') {
        throw new CustomError(
            ErrorType.FORBIDDEN,
            'You do not have permission to publish articles'
        );
    }
    // Kiểm tra bài viết tồn tại
    const existingArticle = await findArticleByIdForEdit(id);
    if (!existingArticle) {
        throw new CustomError(ErrorType.NOT_FOUND, 'Article not found');
    }

    // Kiểm tra quyền: chỉ admin hoặc tác giả mới được sửa
    if (userRole !== 'admin' && existingArticle.authorId !== userId) {
        throw new CustomError(
            ErrorType.FORBIDDEN,
            'You do not have permission to edit this article'
        );
    }

    // Nếu có category mới, kiểm tra tồn tại
    if (data.categoryId && data.categoryId !== existingArticle.categoryId) {
        const category = await findCategoryById(data.categoryId);
        if (!category) {
            throw new CustomError(ErrorType.NOT_FOUND, 'Category not found');
        }
    }

    // === XỬ LÝ THUMBNAIL ===
    let thumbnailUrl = existingArticle.imageUrl; // Giữ nguyên thumbnail cũ

    if (files?.newThumbnail && files.newThumbnail[0]) {
        // Có thumbnail mới → Upload và xóa ảnh cũ song song
        const uploadAndDeletePromises: Promise<any>[] = [];

        // Thêm promise xóa ảnh cũ nếu có
        if (existingArticle.imageUrl) {
            uploadAndDeletePromises.push(
                deleteFromCloudinary(existingArticle.imageUrl)
            );
        }

        try {
            const uploadResult = await uploadToCloudinary(
                files.newThumbnail[0].path,
                {
                    folder: 'healthsystem/articles/thumbnails',
                }
            );
            thumbnailUrl = uploadResult.url;
            if (existingArticle.imageUrl) {
                await deleteFromCloudinary(existingArticle.imageUrl).catch(
                    () => true
                );
            }
        } catch (error) {
            throw new CustomError(
                ErrorType.INTERNAL_ERROR,
                'Failed to process thumbnail'
            );
        }
    }

    // === XỬ LÝ IMAGES ===

    // Xóa những images không dùng tới
    const imagesToDelete = data.deletedImages || [];

    // Upload ảnh mới và xóa ảnh cũ song song
    const uploadPromises: Promise<any>[] = [];
    const deletePromises: Promise<any>[] = [];

    // Upload ảnh mới từ files
    if (files?.newImages && files.newImages.length > 0) {
        files.newImages.forEach((file) => {
            uploadPromises.push(
                uploadToCloudinary(file.path, {
                    folder: 'healthsystem/articles/images',
                })
            );
        });
    }

    // Xóa ảnh cũ không dùng tới khỏi Cloudinary
    imagesToDelete.forEach((url: string) => {
        deletePromises.push(deleteFromCloudinary(url));
    });

    // Chạy song song tất cả upload và delete
    let newlyUploadedUrls: string[] = [];
    try {
        const [uploadResults] = await Promise.all([
            Promise.all(uploadPromises),
            Promise.allSettled(deletePromises),
        ]);
        newlyUploadedUrls = uploadResults.map((result) => result.url);
    } catch (error) {
        throw new CustomError(
            ErrorType.INTERNAL_ERROR,
            'Failed to process images'
        );
    }

    // Kết hợp: images giữ lại + images mới upload
    const finalImageUrls = [...newlyUploadedUrls];
    if (data.imagesUrl && Array.isArray(data.imagesUrl)) {
        finalImageUrls.push(...data.imagesUrl);
    } else if (!data.imagesUrl) {
        finalImageUrls.push(...existingArticle.images);
    }

    // === CHUẨN BỊ DỮ LIỆU UPDATE ===
    const updateData: any = {};
    if (data.content !== undefined) updateData.content = data.content;
    if (data.summary !== undefined) updateData.summary = data.summary;
    if (thumbnailUrl !== existingArticle.imageUrl)
        updateData.imageUrl = thumbnailUrl;
    updateData.images = finalImageUrls;
    if (data.categoryId !== undefined) updateData.categoryId = data.categoryId;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.featured !== undefined) updateData.featured = data.featured;
    if (data.extras !== undefined) updateData.extras = data.extras;
    if (data.toc !== undefined) updateData.toc = data.toc;
    if (data.title !== undefined) updateData.title = data.title;
    if (data.slug && data.slug !== existingArticle.slug) {
        updateData.slug = await generateUniqueSlug(data.slug, id);
    } else if (data.title && data.title !== existingArticle.title) {
        updateData.slug = await generateUniqueSlug(data.title, id);
    }

    // Cập nhật bài viết
    const updatedArticle = await updateArticle(id, updateData);

    return updatedArticle;
};

// Xóa bài viết
const deleteExistingArticle = async (
    id: string,
    userId: string,
    userRole: string
) => {
    // Kiểm tra bài viết tồn tại
    const existingArticle = await findArticleByIdForEdit(id);
    if (!existingArticle) {
        throw new CustomError(ErrorType.NOT_FOUND, 'Article not found');
    }

    // Kiểm tra quyền: chỉ admin hoặc tác giả mới được xóa
    if (
        userRole !== 'admin' &&
        existingArticle.authorId !== userId &&
        existingArticle.assigneeId !== userId
    ) {
        throw new CustomError(
            ErrorType.FORBIDDEN,
            'You do not have permission to delete this article'
        );
    }

    await deleteArticle(id);
    const deleteImagePromises: Promise<any>[] = [];

    // Xóa thumbnail nếu có
    if (existingArticle.imageUrl) {
        deleteImagePromises.push(
            deleteFromCloudinary(existingArticle.imageUrl)
        );
    }

    // Xóa tất cả images nếu có
    if (existingArticle.images && Array.isArray(existingArticle.images)) {
        existingArticle.images.forEach((imageUrl: string) => {
            deleteImagePromises.push(deleteFromCloudinary(imageUrl));
        });
    } else if (
        existingArticle.images &&
        typeof existingArticle.images === 'string'
    ) {
        deleteImagePromises.push(deleteFromCloudinary(existingArticle.images));
    }

    if (deleteImagePromises.length > 0) {
        await Promise.allSettled(deleteImagePromises);
    }

    return { message: 'Article deleted successfully' };
};

const sendArticleForReview = async (articleId: string, userId: string) => {
    // Kiểm tra bài viết tồn tại
    const existingArticle = await findArticleByIdForEdit(articleId);
    if (!existingArticle) {
        throw new CustomError(ErrorType.NOT_FOUND, 'Article not found');
    }
    const user = await findUserById(userId);
    if (!user) {
        throw new CustomError(
            ErrorType.INTERNAL_ERROR,
            'Someting errors occurred'
        );
    }
    if (!['admin', 'doctor'].includes(user.role.name)) {
        throw new CustomError(
            ErrorType.FORBIDDEN,
            'You do not have permission to send articles for review'
        );
    }
    // Chỉ tác giả mới được gửi kiểm duyệt
    if (['published', 'pending_review'].includes(existingArticle.status)) {
        throw new CustomError(
            ErrorType.BAD_REQUEST,
            'Article is already published or pending review'
        );
    }
    if (
        existingArticle.status !== 'reedited' &&
        existingArticle.authorId !== userId &&
        user.role.name === 'doctor'
    ) {
        throw new CustomError(
            ErrorType.FORBIDDEN,
            'You do not have permission to send this article for review'
        );
    }
    if (
        existingArticle.status === 'reedited' &&
        existingArticle.assigneeId !== userId &&
        user.role.name === 'doctor'
    ) {
        throw new CustomError(
            ErrorType.FORBIDDEN,
            'You do not have permission to send this reedited article for review'
        );
    }
    // Cập nhật trạng thái bài viết thành "pending_review"
    const updatedArticle = await updateArticle(articleId, {
        status: 'pending_review',
    });
    return updatedArticle;
};

const rejectArticleReview = async (
    articleId: string,
    rejectionReason: string
) => {
    // Kiểm tra bài viết tồn tại
    const existingArticle = await findArticleByIdForEdit(articleId);
    if (!existingArticle) {
        throw new CustomError(ErrorType.NOT_FOUND, 'Article not found');
    }
    if (existingArticle.status !== 'pending_review') {
        throw new CustomError(
            ErrorType.BAD_REQUEST,
            'Only articles pending review can be rejected'
        );
    }
    await updateArticle(articleId, {
        status: 'rejected',
        reasonReject: rejectionReason,
    });
    return { message: 'Article review rejected successfully' };
};

// Approval article review
const approvalArticleReview = async (articleId: string) => {
    // Kiểm tra bài viết tồn tại
    const existingArticle = await findArticleByIdForEdit(articleId);
    if (!existingArticle) {
        throw new CustomError(ErrorType.NOT_FOUND, 'Article not found');
    }
    if (existingArticle.status !== 'pending_review') {
        throw new CustomError(
            ErrorType.BAD_REQUEST,
            'Only articles pending review can be approved'
        );
    }
    await updateArticle(articleId, {
        status: 'published',
    });
    return { message: 'Article review approved successfully' };
};

const requestEditArticle = async (articleId: string, assigneeId: string) => {
    // Kiểm tra bài viết tồn tại
    const existingArticle = await findArticleByIdForEdit(articleId);
    if (!existingArticle) {
        throw new CustomError(ErrorType.NOT_FOUND, 'Article not found');
    }
    if (existingArticle.status !== 'published') {
        throw new CustomError(
            ErrorType.BAD_REQUEST,
            'Only published articles can be requested for edit'
        );
    }
    const assigneedUser = await findUserById(assigneeId);
    if (!assigneedUser) {
        throw new CustomError(ErrorType.NOT_FOUND, 'Assignee user not found');
    }
    if (assigneedUser.role.name !== 'doctor') {
        throw new CustomError(
            ErrorType.BAD_REQUEST,
            'Only doctors can be assigned to edit articles'
        );
    }
    await updateArticle(articleId, {
        status: 'reedited',
        assigneeId,
    });
    return { message: 'Article edit requested successfully' };
};

export default {
    getArticleById,
    getArticleBySlug,
    getFeaturedArticles,
    getLatestArticlesByAllCategories,
    getArticlesByCategory,
    getMostViewedArticlesByAllCategories,
    getRelatedArticles,
    getArticles,
    createNewArticle,
    updateExistingArticle,
    deleteExistingArticle,
    sendArticleForReview,
    rejectArticleReview,
    approvalArticleReview,
    requestEditArticle,
};
