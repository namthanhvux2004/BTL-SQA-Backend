import { Request, Response } from 'express';
import categoryService from '@src/services/category.service';
import { SuccessResponse } from '@src/core/ApiResponse';
import {
    AddCategoryDataDto,
    GetCategoriesDataDto,
} from '@src/dtos/category.dto';

const createCategory = async (
    req: Request<{}, {}, AddCategoryDataDto>,
    res: Response
) => {
    const newCategory = await categoryService.createCategory(req.body);
    return new SuccessResponse(
        newCategory,
        'Category created successfully'
    ).send(res);
};

const getCategories = async (req: Request, res: Response) => {
    const categories = await categoryService.getCategories(
        req.query as unknown as GetCategoriesDataDto
    );
    return new SuccessResponse(
        categories.data,
        'Categories retrieved successfully',
        categories.metadata
    ).send(res);
};

const getCategoryById = async (req: Request, res: Response) => {
    const { id } = req.params;
    const category = await categoryService.getCategoryById(id!);
    return new SuccessResponse(
        category,
        'Category retrieved successfully'
    ).send(res);
};

const getCategoryBySlug = async (req: Request, res: Response) => {
    const { slug } = req.params;
    const category = await categoryService.getCategoryBySlug(slug!);
    return new SuccessResponse(
        category,
        'Category retrieved successfully'
    ).send(res);
};

const updateCategory = async (req: Request, res: Response) => {
    const { id } = req.params;
    const updatedCategory = await categoryService.updateCategory(id!, req.body);
    return new SuccessResponse(
        updatedCategory,
        'Category updated successfully'
    ).send(res);
};

const deleteCategory = async (req: Request, res: Response) => {
    const { id } = req.params;
    await categoryService.deleteCategory(id!);
    return new SuccessResponse({}, 'Category deleted successfully').send(res);
};

export default {
    createCategory,
    getCategories,
    getCategoryById,
    getCategoryBySlug,
    updateCategory,
    deleteCategory,
};
