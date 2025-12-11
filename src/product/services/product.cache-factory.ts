import { CacheService } from '../../cache/cache.service';
import { CacheKeyFactory } from '../../cache/cache-key.factory';
import { PaginationResult } from '../../common/pagination';
import { Product } from '../product.schema';
import { CacheStrategy, NoCacheStrategy, VersionedCacheStrategy } from './product.cache-strategy';

export class ProductCacheStrategyFactory {
  constructor(
    private readonly cacheService: CacheService,
    private readonly cacheKeyFactory: CacheKeyFactory,
  ) {}

  createForDetail(
    identifier: string,
    includeArchived: boolean,
  ): CacheStrategy<Product | null> {
    if (includeArchived) {
      return new NoCacheStrategy<Product | null>();
    }
    return new VersionedCacheStrategy<Product | null>(
      this.cacheService,
      this.cacheKeyFactory.getProductDetailVersionKey(identifier),
      (version) => this.cacheKeyFactory.getProductDetailKey(identifier, parseInt(version)),
    );
  }

  createForGlobalList(
    page: number,
    limit: number,
    includeOutOfStock: boolean,
    includeArchived: boolean,
  ): CacheStrategy<PaginationResult<Product>> {
    return new VersionedCacheStrategy<PaginationResult<Product>>(
      this.cacheService,
      this.cacheKeyFactory.getProductGlobalListVersionKey(),
      (version) =>
        this.cacheKeyFactory.getProductGlobalListKey(
          page,
          limit,
          'createdAt:desc',
          parseInt(version),
          includeOutOfStock,
          includeArchived,
        ),
    );
  }

  createForCategoryList(
    categoryId: string,
    page: number,
    limit: number,
    includeArchived: boolean,
  ): CacheStrategy<PaginationResult<Product>> {
    return new VersionedCacheStrategy<PaginationResult<Product>>(
      this.cacheService,
      this.cacheKeyFactory.getProductListVersionKey(categoryId),
      (version) =>
        this.cacheKeyFactory.getProductListKey(
          categoryId,
          page,
          limit,
          'createdAt:desc',
          parseInt(version),
          false,
          includeArchived,
        ),
    );
  }

  createNoCache<T>(): CacheStrategy<T> {
    return new NoCacheStrategy<T>();
  }
}
