import { createQueryBuilder } from '@src/helpers/queryBuilder';
import { PaginationQuery } from '@src/types';

const getAllMedicines = async (query: PaginationQuery) => {
    const pagination: Partial<PaginationQuery> = {
        page: String(query.page || 1),
        limit: query.limit ? String(query.limit) : undefined,
    };
    const search = query.search ? String(query.search) : undefined;
    const queryBuilder = createQueryBuilder('medicine');
    return await queryBuilder.findManyWithPagination(
        {
            where: search
                ? {
                      OR: [
                          {
                              name: {
                                  contains: search,
                                  mode: 'insensitive',
                              },
                          },
                          {
                              id: {
                                  contains: search,
                                  mode: 'insensitive',
                              },
                          },
                      ],
                  }
                : {},
        },
        pagination
    );
};

export default {
    getAllMedicines,
};
