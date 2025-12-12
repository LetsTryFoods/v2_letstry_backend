import { PaginationResult } from '../../common/pagination';
import { Product } from '../product.schema';
import { ProductRepository } from './product.repository';
import { ProductCacheStrategyFactory } from './product.cache-factory';
import { QueryExecutor } from './product.query-executor';
import { ProductQueryBuilder } from './product.query-builder';

export class ProductQueryService {
  private readonly executor: QueryExecutor;

  constructor(
    repository: ProductRepository,
    private readonly cacheStrategyFactory: ProductCacheStrategyFactory,
  ) {
    this.executor = new QueryExecutor(repository, cacheStrategyFactory);
  }

  async findAll(
    includeOutOfStock: boolean,
    includeArchived: boolean,
  ): Promise<Product[]> {
    const filter = ProductQueryBuilder.forAll(includeOutOfStock, includeArchived);
    const strategy = this.cacheStrategyFactory.createNoCache<Product[]>();
    return this.executor.executeFind(filter, strategy);
  }

  async findOne(id: string, includeArchived: boolean): Promise<Product> {
    const filter = ProductQueryBuilder.forId(id, includeArchived);
    const strategy = this.cacheStrategyFactory.createForDetail(id, includeArchived);
    return this.executor.executeFindOneOrThrow(
      filter,
      strategy,
      `Product with ID ${id} not found`,
    );
  }

  async findBySlug(slug: string, includeArchived: boolean): Promise<Product> {
    const filter = ProductQueryBuilder.forSlug(slug, includeArchived);
    const strategy = this.cacheStrategyFactory.createForDetail(slug, includeArchived);
    return this.executor.executeFindOneOrThrow(
      filter,
      strategy,
      `Product with slug ${slug} not found`,
    );
  }

  async findByVariantId(variantId: string, includeArchived: boolean): Promise<Product> {
    const filter = ProductQueryBuilder.forVariantId(variantId, includeArchived);
    const strategy = this.cacheStrategyFactory.createNoCache<Product>();
    return this.executor.executeFindOneOrThrow(
      filter,
      strategy,
      `Product with variant ID ${variantId} not found`,
    );
  }

  async findByCategoryId(
    categoryId: string,
    includeArchived: boolean,
  ): Promise<Product[]> {
    const filter = ProductQueryBuilder.forCategory(categoryId, includeArchived);
    const strategy = this.cacheStrategyFactory.createNoCache<Product[]>();
    return this.executor.executeFind(filter, strategy);
  }

  async searchProducts(
    searchTerm: string,
    includeArchived: boolean,
  ): Promise<Product[]> {
    const filter = ProductQueryBuilder.forSearch(searchTerm, includeArchived);
    const strategy = this.cacheStrategyFactory.createNoCache<Product[]>();
    return this.executor.executeFind(filter, strategy);
  }

  async findAllPaginated(
    page: number,
    limit: number,
    includeOutOfStock: boolean,
    includeArchived: boolean,
  ): Promise<PaginationResult<Product>> {
    const filter = ProductQueryBuilder.forAll(includeOutOfStock, includeArchived);
    const strategy = this.cacheStrategyFactory.createForGlobalList(
      page,
      limit,
      includeOutOfStock,
      includeArchived,
    );
    return this.executor.executePaginated(filter, page, limit, strategy);
  }

  async findByCategoryIdPaginated(
    categoryId: string,
    page: number,
    limit: number,
    includeArchived: boolean,
  ): Promise<PaginationResult<Product>> {
    const filter = ProductQueryBuilder.forCategory(categoryId, includeArchived);
    const strategy = this.cacheStrategyFactory.createForCategoryList(
      categoryId,
      page,
      limit,
      includeArchived,
    );
    return this.executor.executePaginated(filter, page, limit, strategy);
  }

  async searchProductsPaginated(
    searchTerm: string,
    page: number,
    limit: number,
    includeArchived: boolean,
  ): Promise<PaginationResult<Product>> {
    const filter = ProductQueryBuilder.forSearch(searchTerm, includeArchived);
    const strategy = this.cacheStrategyFactory.createNoCache<PaginationResult<Product>>();
    return this.executor.executePaginated(filter, page, limit, strategy);
  }

  async countByCategoryId(
    categoryId: string,
    includeArchived: boolean,
  ): Promise<number> {
    const filter = ProductQueryBuilder.forCategory(categoryId, includeArchived);
    const strategy = this.cacheStrategyFactory.createNoCache<number>();
    return this.executor.executeCount(filter, strategy);
  }
}
