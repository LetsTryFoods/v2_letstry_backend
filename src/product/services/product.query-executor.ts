import { NotFoundException } from '@nestjs/common';
import { PaginationResult } from '../../common/pagination';
import { Product } from '../product.schema';
import { ProductFilter } from './product.types';
import { ProductRepository } from './product.repository';
import { ProductCacheStrategyFactory } from './product.cache-factory';
import { CacheStrategy } from './product.cache-strategy';
import { PaginationCalculator } from './product.pagination';

export class QueryExecutor {
  constructor(
    private readonly repository: ProductRepository,
    private readonly cacheStrategyFactory: ProductCacheStrategyFactory,
  ) {}

  async executeFind(
    filter: ProductFilter,
    cacheStrategy: CacheStrategy<Product[]>,
  ): Promise<Product[]> {
    return cacheStrategy.execute(() => this.repository.find(filter));
  }

  async executeFindOne(
    filter: ProductFilter,
    cacheStrategy: CacheStrategy<Product | null>,
  ): Promise<Product | null> {
    return cacheStrategy.execute(() => this.repository.findOne(filter));
  }

  async executeFindOneOrThrow(
    filter: ProductFilter,
    cacheStrategy: CacheStrategy<Product | null>,
    errorMessage: string,
  ): Promise<Product> {
    const result = await this.executeFindOne(filter, cacheStrategy);
    if (!result) {
      throw new NotFoundException(errorMessage);
    }
    return result;
  }

  async executePaginated(
    filter: ProductFilter,
    page: number,
    limit: number,
    cacheStrategy: CacheStrategy<PaginationResult<Product>>,
  ): Promise<PaginationResult<Product>> {
    return cacheStrategy.execute(async () => {
      const paginationParams = PaginationCalculator.calculate(page, limit, 0);
      const [totalCount, items] = await Promise.all([
        this.repository.countDocuments(filter),
        this.repository.findPaginated(filter, paginationParams.skip, limit),
      ]);
      const finalParams = PaginationCalculator.calculate(page, limit, totalCount);
      return PaginationCalculator.createResult(
        items,
        page,
        limit,
        totalCount,
        finalParams,
      );
    });
  }

  async executeCount(
    filter: ProductFilter,
    cacheStrategy: CacheStrategy<number>,
  ): Promise<number> {
    return cacheStrategy.execute(() => this.repository.countDocuments(filter));
  }
}
