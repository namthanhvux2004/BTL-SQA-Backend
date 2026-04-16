import { PrismaClient, Prisma } from '@prisma/client';
import { CustomError, ErrorType } from '@src/core/Error';
import { PaginationQuery } from '@src/types/common/api.types';

const prisma = new PrismaClient();

// Generic types for better type safety
type PrismaModel = Exclude<keyof PrismaClient, `$${string}` | symbol>;

type ModelDelegate<T extends PrismaModel> = PrismaClient[T];

// Enhanced type definitions with proper return types
type QueryOptions<T extends PrismaModel> = {
    where?: Prisma.Args<ModelDelegate<T>, 'findMany'>['where'];
    orderBy?: Prisma.Args<ModelDelegate<T>, 'findMany'>['orderBy'];
    skip?: number;
    take?: number;
    select?: Prisma.Args<ModelDelegate<T>, 'findMany'>['select'];
    include?: Prisma.Args<T, 'findMany'>['include'];
    distinct?: Prisma.Args<ModelDelegate<T>, 'findMany'>['distinct'];
};

type CountOptions<T extends PrismaModel> = {
    where?: Prisma.Args<ModelDelegate<T>, 'count'>['where'];
    select?: Prisma.Args<ModelDelegate<T>, 'count'>['select'];
    distinct?: Prisma.Args<T, 'count'>['distinct'];
};

// Return type helpers
type FindManyResult<
    T extends PrismaModel,
    O extends QueryOptions<T>,
> = Prisma.Result<ModelDelegate<T>, O, 'findMany'>;

type FindUniqueResult<
    T extends PrismaModel,
    O extends Omit<QueryOptions<T>, 'where' | 'skip' | 'take'>,
> = Prisma.Result<ModelDelegate<T>, O, 'findUnique'>;

type FindFirstResult<
    T extends PrismaModel,
    O extends QueryOptions<T>,
> = Prisma.Result<ModelDelegate<T>, O, 'findFirst'>;

type CreateResult<
    T extends PrismaModel,
    O extends Omit<QueryOptions<T>, 'where' | 'skip' | 'take'>,
> = Prisma.Result<ModelDelegate<T>, O, 'create'>;

type UpdateResult<
    T extends PrismaModel,
    O extends Omit<QueryOptions<T>, 'where' | 'skip' | 'take'>,
> = Prisma.Result<ModelDelegate<T>, O, 'update'>;

type UpsertResult<
    T extends PrismaModel,
    O extends Omit<QueryOptions<T>, 'where' | 'skip' | 'take'>,
> = Prisma.Result<ModelDelegate<T>, O, 'upsert'>;

type DeleteResult<T extends PrismaModel> = Prisma.Result<
    ModelDelegate<T>,
    {},
    'delete'
>;

type CountResult<
    T extends PrismaModel,
    O extends CountOptions<T>,
> = Prisma.Result<ModelDelegate<T>, O, 'count'>;

type AggregateResult<
    T extends PrismaModel,
    O extends Prisma.Args<ModelDelegate<T>, 'aggregate'>,
> = Prisma.Result<ModelDelegate<T>, O, 'aggregate'>;

type GroupByResult<
    T extends PrismaModel,
    O extends Prisma.Args<ModelDelegate<T>, 'groupBy'>,
> = Prisma.Result<ModelDelegate<T>, O, 'groupBy'>;

type PaginationResult<T> = {
    data: T[];
    metadata: {
        page: number;
        limit?: number | undefined;
        totalItems: number;
        totalPages: number;
        hasNext: boolean;
        hasPrev: boolean;
    };
};

type TransactionCallback<T> = (tx: Prisma.TransactionClient) => Promise<T>;

export class QueryBuilder<T extends PrismaModel> {
    private model: T;
    private delegate: any;

    constructor(model: T) {
        this.model = model;
        this.delegate = prisma[model] as any;

        if (!this.delegate) {
            throw new CustomError(ErrorType.BAD_REQUEST, 'Invalid model');
        }
    }

    // Find many with proper return type
    async findMany<O extends QueryOptions<T>>(
        options: O = {} as O
    ): Promise<FindManyResult<T, O>> {
        try {
            this.validateDelegate('findMany');

            return await this.delegate.findMany({
                where: options.where,
                orderBy: options.orderBy,
                skip: options.skip,
                take: options.take,
                select: options.select,
                include: options.include,
                distinct: options.distinct,
            });
        } catch (error) {
            this.handleError(error, 'findMany');
        }
    }

    // Find with pagination
    async findManyWithPagination<O extends QueryOptions<T>>(
        options: O = {} as O,
        pagination: Partial<PaginationQuery>
    ): Promise<PaginationResult<FindManyResult<T, O>[0]>> {
        try {
            const limit = pagination.limit
                ? parseInt(pagination.limit)
                : undefined;
            const page = limit ? parseInt(pagination.page || '1') : 1;

            const orderBy = this.buildOrderBy(
                pagination.sortBy,
                pagination.sortOrder
            );
            const searchFilter = this.buildSearchFilter(pagination.search);

            const whereClause = {
                ...options.where,
                ...searchFilter,
            };

            const skip = limit ? (page - 1) * limit : undefined;

            const [data, totalItems] = await Promise.all([
                this.delegate.findMany({
                    ...options,
                    where: whereClause,
                    orderBy: { ...orderBy, ...options.orderBy },
                    skip,
                    take: limit,
                }),
                this.delegate.count({
                    where: whereClause,
                }),
            ]);

            const totalPages = limit ? Math.ceil(totalItems / limit) : 1;

            return {
                data,
                metadata: {
                    page,
                    limit,
                    totalItems,
                    totalPages,
                    hasNext: page < totalPages,
                    hasPrev: page > 1,
                },
            };
        } catch (error) {
            this.handleError(error, 'findManyWithPagination');
        }
    }

    // Find unique with proper return type
    async findUnique<
        O extends Omit<QueryOptions<T>, 'where' | 'skip' | 'take'>,
    >(
        where: Prisma.Args<ModelDelegate<T>, 'findUnique'>['where'],
        options: O = {} as O
    ): Promise<FindUniqueResult<T, O> | null> {
        try {
            this.validateDelegate('findUnique');

            return await this.delegate.findUnique({
                where,
                select: options.select,
                include: options.include,
            });
        } catch (error) {
            this.handleError(error, 'findUnique');
        }
    }

    // Find first with proper return type
    async findFirst<O extends QueryOptions<T>>(
        options: O = {} as O
    ): Promise<FindFirstResult<T, O> | null> {
        try {
            this.validateDelegate('findFirst');

            return await this.delegate.findFirst({
                where: options.where,
                orderBy: options.orderBy,
                select: options.select,
                include: options.include,
                skip: options.skip,
            });
        } catch (error) {
            this.handleError(error, 'findFirst');
        }
    }

    // Count with proper return type
    async count<O extends CountOptions<T>>(
        options: O = {} as O
    ): Promise<CountResult<T, O>> {
        try {
            this.validateDelegate('count');

            return await this.delegate.count({
                where: options.where,
                select: options.select,
                distinct: options.distinct,
            });
        } catch (error) {
            this.handleError(error, 'count');
        }
    }

    // Create with proper return type
    async create<O extends Omit<QueryOptions<T>, 'where' | 'skip' | 'take'>>(
        data: Prisma.Args<ModelDelegate<T>, 'create'>['data'],
        options: O = {} as O
    ): Promise<CreateResult<T, O>> {
        try {
            this.validateDelegate('create');

            return await this.delegate.create({
                data,
                select: options.select,
                include: options.include,
            });
        } catch (error) {
            this.handleError(error, 'create');
        }
    }

    // Update with proper return type
    async update<O extends Omit<QueryOptions<T>, 'where' | 'skip' | 'take'>>(
        where: Prisma.Args<ModelDelegate<T>, 'update'>['where'],
        data: Prisma.Args<ModelDelegate<T>, 'update'>['data'],
        options: O = {} as O
    ): Promise<UpdateResult<T, O>> {
        try {
            this.validateDelegate('update');

            return await this.delegate.update({
                where,
                data,
                select: options.select,
                include: options.include,
            });
        } catch (error) {
            this.handleError(error, 'update');
        }
    }

    // Delete with proper return type
    async delete(
        where: Prisma.Args<ModelDelegate<T>, 'delete'>['where']
    ): Promise<DeleteResult<T>> {
        try {
            this.validateDelegate('delete');

            return await this.delegate.delete({
                where,
            });
        } catch (error) {
            this.handleError(error, 'delete');
        }
    }

    // Upsert with proper return type
    async upsert<O extends Omit<QueryOptions<T>, 'where' | 'skip' | 'take'>>(
        where: Prisma.Args<ModelDelegate<T>, 'upsert'>['where'],
        create: Prisma.Args<ModelDelegate<T>, 'upsert'>['create'],
        update: Prisma.Args<ModelDelegate<T>, 'upsert'>['update'],
        options: O = {} as O
    ): Promise<UpsertResult<T, O>> {
        try {
            this.validateDelegate('upsert');

            return await this.delegate.upsert({
                where,
                create,
                update,
                select: options.select,
                include: options.include,
            });
        } catch (error) {
            this.handleError(error, 'upsert');
        }
    }

    // Aggregate with proper return type
    async aggregate<O extends Prisma.Args<ModelDelegate<T>, 'aggregate'>>(
        options: O
    ): Promise<AggregateResult<T, O>> {
        try {
            this.validateDelegate('aggregate');

            return await this.delegate.aggregate(options);
        } catch (error) {
            this.handleError(error, 'aggregate');
        }
    }

    // Group by with proper return type
    async groupBy<O extends Prisma.Args<ModelDelegate<T>, 'groupBy'>>(
        options: O
    ): Promise<GroupByResult<T, O>> {
        try {
            this.validateDelegate('groupBy');

            return await this.delegate.groupBy(options);
        } catch (error) {
            this.handleError(error, 'groupBy');
        }
    }

    // Helper methods for common queries with proper types
    async findById<O extends Omit<QueryOptions<T>, 'where' | 'skip' | 'take'>>(
        id: string | number,
        options: O = {} as O
    ): Promise<FindUniqueResult<T, O> | null> {
        return this.findUnique({ id } as any, options);
    }

    async findByEmail<
        O extends Omit<QueryOptions<T>, 'where' | 'skip' | 'take'>,
    >(
        email: string,
        options: O = {} as O
    ): Promise<FindUniqueResult<T, O> | null> {
        return this.findUnique({ email } as any, options);
    }

    async exists(
        where: Prisma.Args<ModelDelegate<T>, 'findFirst'>['where']
    ): Promise<boolean> {
        const result = await this.findFirst({ where });
        return result !== null;
    }

    // Private helper methods remain the same
    private validateDelegate(operation: string) {
        if (!this.delegate || typeof this.delegate[operation] !== 'function') {
            throw new CustomError(
                ErrorType.BAD_REQUEST,
                `Operation ${operation} is not supported for model ${String(
                    this.model
                )}`
            );
        }
    }

    private buildOrderBy(sortBy?: string, sortOrder?: 'asc' | 'desc') {
        if (!sortBy) return undefined;
        return { [sortBy]: sortOrder || 'asc' };
    }

    private buildSearchFilter(search?: string) {
        if (!search) return {};

        const searchableFields = this.getSearchableFields();
        if (searchableFields.length === 0) return {};

        return {
            OR: searchableFields.map((field) => ({
                [field]: {
                    contains: search,
                    mode: 'insensitive' as const,
                },
            })),
        };
    }

    private getSearchableFields(): string[] {
        const searchableFieldsMap: Record<string, string[]> = {
            user: ['username', 'email'],
            patient: ['patientId'],
            doctor: ['specialty'],
            appointment: ['reason', 'notes'],
            medicalRecord: ['symptoms', 'diagnosis', 'treatments'],
            healthArticle: ['title', 'summary'],
            category: ['name', 'description'],
        };

        return searchableFieldsMap[String(this.model)] || [];
    }

    private handleError(error: any, operation: string): never {
        console.error(
            `QueryBuilder Error [${String(this.model)}.${operation}]:`,
            error
        );

        if (error instanceof CustomError) {
            throw error;
        }

        if (error.code) {
            switch (error.code) {
                case 'P2002':
                    throw new CustomError(
                        ErrorType.BAD_REQUEST,
                        'Unique constraint violation'
                    );
                case 'P2025':
                    throw new CustomError(
                        ErrorType.NOT_FOUND,
                        'Record not found'
                    );
                case 'P2003':
                    throw new CustomError(
                        ErrorType.BAD_REQUEST,
                        'Foreign key constraint violation'
                    );
                default:
                    throw new CustomError(
                        ErrorType.INTERNAL_ERROR,
                        `Database operation failed: ${error.message}`
                    );
            }
        }

        throw new CustomError(
            ErrorType.INTERNAL_ERROR,
            `Query operation failed: ${error.message}`
        );
    }
}

// Static factory function with proper typing
export function createQueryBuilder<T extends PrismaModel>(
    model: T
): QueryBuilder<T> {
    return new QueryBuilder(model);
}

// Transaction helper with proper typing
export async function executeTransaction<T>(
    callback: TransactionCallback<T>
): Promise<T> {
    try {
        return await prisma.$transaction(callback);
    } catch (error) {
        console.error('Transaction Error:', error);
        throw new CustomError(ErrorType.INTERNAL_ERROR, `Transaction failed`);
    }
}

// Legacy function with proper typing
export async function queryData<
    T extends PrismaModel,
    O extends QueryOptions<T>,
>(model: T, options: O): Promise<FindManyResult<T, O>> {
    const builder = new QueryBuilder(model);
    return builder.findMany(options);
}

export default QueryBuilder;
