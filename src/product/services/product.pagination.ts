import { PaginationResult } from '../../common/pagination';
import { PaginationParams } from './product.types';

export class PaginationCalculator {
  static calculate(page: number, limit: number, totalCount: number): PaginationParams {
    const skip = (page - 1) * limit;
    const totalPages = Math.ceil(totalCount / limit);
    return {
      skip,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    };
  }

  static createResult<T>(
    items: T[],
    page: number,
    limit: number,
    totalCount: number,
    paginationParams: PaginationParams,
  ): PaginationResult<T> {
    return {
      items,
      meta: {
        totalCount,
        page,
        limit,
        totalPages: paginationParams.totalPages,
        hasNextPage: paginationParams.hasNextPage,
        hasPreviousPage: paginationParams.hasPreviousPage,
      },
    };
  }
}
