import {
    AddCategoryDataDto,
    GetCategoriesDataDto,
    UpdateCategoryDataDto,
} from '@src/dtos/category.dto';
import * as categoryDao from '@src/daos/category.dao';
import { CustomError, ErrorType } from '@src/core/Error';

const createCategory = async (data: AddCategoryDataDto) => {
    const { name } = data;

    const existingCategory = await categoryDao.findCategoryByName(name);
    if (existingCategory) {
        throw new CustomError(
            ErrorType.BAD_REQUEST,
            'Category with this name already exists'
        );
    }

    const newCategory = await categoryDao.createCategory(data);
    return newCategory;
};

const getCategories = async (query: GetCategoriesDataDto) => {
    const { search, parentId, ...rest } = query;
    const options = {
        ...rest,
        ...(search && { search }),
        ...(parentId && { parentId }),
    };
    const categories = await categoryDao.findCategories(options);
    return categories;
};

const getCategoryById = async (id: string) => {
    const category = await categoryDao.findCategoryById(id);
    if (!category) {
        throw new CustomError(ErrorType.NOT_FOUND, 'Category not found');
    }
    return category;
};

const getCategoryBySlug = async (slug: string) => {
    const category = await categoryDao.findCategoryBySlug(slug);
    if (!category) {
        throw new CustomError(ErrorType.NOT_FOUND, 'Category not found');
    }
    return category;
};

const updateCategory = async (
    id: string,
    data: Partial<UpdateCategoryDataDto>
) => {
    const category = await categoryDao.findCategoryById(id);
    if (!category) {
        throw new CustomError(ErrorType.NOT_FOUND, 'Category not found');
    }

    if (data.name && data.name !== category.name) {
        const existingCategory = await categoryDao.findCategoryByName(
            data.name
        );
        if (existingCategory && existingCategory.id !== id) {
            throw new CustomError(
                ErrorType.BAD_REQUEST,
                'Category with this name already exists'
            );
        }
    }

    if (data.parentId) {
        if (data.parentId === id) {
            throw new CustomError(
                ErrorType.BAD_REQUEST,
                'A category cannot be its own parent'
            );
        }
        const parentCategory = await categoryDao.findCategoryById(
            data.parentId
        );
        if (!parentCategory) {
            throw new CustomError(
                ErrorType.NOT_FOUND,
                'Parent category not found'
            );
        }
    }

    const updatedCategory = await categoryDao.updateCategory(id, data);
    return updatedCategory;
};

const deleteCategory = async (id: string) => {
    const category = await categoryDao.findCategoryById(id);
    if (!category) {
        throw new CustomError(ErrorType.NOT_FOUND, 'Category not found');
    }

    if (category.children.length > 0) {
        throw new CustomError(
            ErrorType.BAD_REQUEST,
            'Cannot delete category with child categories. Please move or delete them first.'
        );
    }

    if (category._count.articles > 0) {
        throw new CustomError(
            ErrorType.BAD_REQUEST,
            'Cannot delete category with associated articles. Please move them to another category first.'
        );
    }

    await categoryDao.deleteCategory(id);
};

export default {
    createCategory,
    getCategories,
    getCategoryById,
    getCategoryBySlug,
    updateCategory,
    deleteCategory,
};
