import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Product, ProductDocument } from './product.schema';
import { CreateProductInput, UpdateProductInput } from './product.input';
import { WinstonLoggerService } from '../logger/logger.service';
import { SlugService } from '../common/services/slug.service';
import { PaginationResult } from '../common/pagination';
import { CacheService } from '../cache/cache.service';
import { CacheKeyFactory } from '../cache/cache-key.factory';
import { CacheInvalidatorService } from '../cache/cache-invalidator.service';

// ============================================================================
// 1. TYPES & CONSTANTS
// ============================================================================
export const PRODUCT_CACHE_TTL = 15552000000;
export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 10;

export interface ProductFilter {
  _id?: string | { $ne: string };
  slug?: string;
  categoryId?: string;
  isArchived?: boolean;
  availabilityStatus?: string | { $ne: string };
  $or?: Array<Record<string, RegExp>>;
  $and?: Array<Record<string, any>>;
}

export interface PaginationParams {
  skip: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface StockUpdateParams {
  stockQuantity: number;
  availabilityStatus: string;
}

// ============================================================================
// 2. QUERY FILTER BUILDER (Single Responsibility)
// ============================================================================
export class ProductQueryBuilder {
  private filter: ProductFilter = {};

  withArchived(includeArchived: boolean): this {
    if (!includeArchived) {
      this.filter.isArchived = false;
    }
    return this;
  }

  withId(id: string): this {
    this.filter._id = id;
    return this;
  }

  withSlug(slug: string): this {
    this.filter.slug = slug;
    return this;
  }

  withCategoryId(categoryId: string): this {
    this.filter.categoryId = categoryId;
    return this;
  }

  withoutOutOfStock(includeOutOfStock: boolean): this {
    if (!includeOutOfStock) {
      this.filter.availabilityStatus = { $ne: 'out_of_stock' };
    }
    return this;
  }

  withSearch(searchTerm: string): this {
    const regex = new RegExp(searchTerm, 'i');
    this.filter.$or = [
      { name: regex },
      { description: regex },
      { brand: regex },
      { keywords: regex },
      { tags: regex },
    ];
    return this;
  }

  excludeId(id: string): this {
    this.filter._id = { $ne: id };
    return this;
  }

  build(): ProductFilter {
    // Handle complex filter combinations
    if (
      this.filter.availabilityStatus &&
      this.filter.isArchived === false &&
      !this.filter.$and
    ) {
      // Move to $and when both conditions exist
      const availStatus = this.filter.availabilityStatus;
      delete this.filter.availabilityStatus;
      this.filter.$and = [
        { isArchived: false },
        { availabilityStatus: availStatus },
      ];
      delete this.filter.isArchived;
    }
    return this.filter;
  }

  // Static factory methods
  static forId(id: string, includeArchived: boolean): ProductFilter {
    return new ProductQueryBuilder()
      .withId(id)
      .withArchived(includeArchived)
      .build();
  }

  static forSlug(slug: string, includeArchived: boolean): ProductFilter {
    return new ProductQueryBuilder()
      .withSlug(slug)
      .withArchived(includeArchived)
      .build();
  }

  static forCategory(
    categoryId: string,
    includeArchived: boolean,
  ): ProductFilter {
    return new ProductQueryBuilder()
      .withCategoryId(categoryId)
      .withArchived(includeArchived)
      .withoutOutOfStock(false)
      .build();
  }

  static forAll(
    includeOutOfStock: boolean,
    includeArchived: boolean,
  ): ProductFilter {
    return new ProductQueryBuilder()
      .withArchived(includeArchived)
      .withoutOutOfStock(includeOutOfStock)
      .build();
  }

  static forSearch(searchTerm: string, includeArchived: boolean): ProductFilter {
    return new ProductQueryBuilder()
      .withSearch(searchTerm)
      .withArchived(includeArchived)
      .withoutOutOfStock(false)
      .build();
  }

  static forSlugCheck(slug: string, excludeId?: string): ProductFilter {
    const builder = new ProductQueryBuilder().withSlug(slug);
    if (excludeId) {
      builder.excludeId(excludeId);
    }
    return builder.build();
  }
}

// ============================================================================
// 3. CACHE STRATEGY (Abstraction for caching logic)
// ============================================================================
export interface CacheStrategy<T> {
  execute(fetchData: () => Promise<T>): Promise<T>;
}

export class NoCacheStrategy<T> implements CacheStrategy<T> {
  async execute(fetchData: () => Promise<T>): Promise<T> {
    return fetchData();
  }
}

export class VersionedCacheStrategy<T> implements CacheStrategy<T> {
  constructor(
    private readonly cacheService: CacheService,
    private readonly versionKey: string,
    private readonly dataKeyFactory: (version: string) => string,
    private readonly ttl: number = PRODUCT_CACHE_TTL,
  ) {}

  async execute(fetchData: () => Promise<T>): Promise<T> {
    const version = await this.cacheService.getVersion(this.versionKey);
    const key = this.dataKeyFactory(version.toString());

    const cached = await this.cacheService.get<T>(key);
    if (cached) return cached;

    const data = await fetchData();
    if (data) {
      await this.cacheService.set(key, data, this.ttl);
    }
    return data;
  }
}

// ============================================================================
// 4. PAGINATION CALCULATOR (Pure function)
// ============================================================================
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

// ============================================================================
// 5. PRODUCT REPOSITORY (Data Access Layer)
// ============================================================================
export class ProductRepository {
  constructor(private readonly productModel: Model<ProductDocument>) {}

  async countDocuments(filter: ProductFilter): Promise<number> {
    return this.productModel.countDocuments(filter).exec();
  }

  async find(filter: ProductFilter): Promise<Product[]> {
    return this.productModel.find(filter).sort({ createdAt: -1 }).exec();
  }

  async findOne(filter: ProductFilter): Promise<Product | null> {
    return this.productModel.findOne(filter).exec();
  }

  async findPaginated(
    filter: ProductFilter,
    skip: number,
    limit: number,
  ): Promise<Product[]> {
    return this.productModel
      .find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec();
  }

  async create(data: any): Promise<Product> {
    const product = new this.productModel(data);
    return product.save();
  }

  async findByIdAndUpdate(
    id: string,
    update: any,
    options?: any,
  ): Promise<Product | null> {
    return this.productModel.findByIdAndUpdate(id, update, options).exec();
  }

  async findById(id: string): Promise<Product | null> {
    return this.productModel.findById(id).exec();
  }
}

// ============================================================================
// 6. CACHE STRATEGY FACTORY (Creates appropriate cache strategy)
// ============================================================================
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

// ============================================================================
// 7. GENERIC QUERY EXECUTOR (Eliminates all query duplication)
// ============================================================================
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
}

// ============================================================================
// 8. PRODUCT QUERY SERVICE (Zero duplication)
// ============================================================================
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
}

// ============================================================================
// 9. PRODUCT COMMAND SERVICE (Write Operations)
// ============================================================================
export class ProductCommandService {
  constructor(
    private readonly repository: ProductRepository,
    private readonly slugService: SlugService,
    private readonly cacheInvalidator: CacheInvalidatorService,
    private readonly logger: WinstonLoggerService,
  ) {}

  async create(input: CreateProductInput): Promise<Product> {
    const slug = await this.resolveSlug(input.name, input.slug);

    const product = await this.repository.create({
      ...input,
      slug,
    });

    await this.cacheInvalidator.invalidateProduct(product);
    this.logger.log(`Product created: ${product._id}`);
    return product;
  }

  async update(id: string, input: UpdateProductInput): Promise<Product> {
    if (input.slug) {
      await this.validateSlugUnique(input.slug, id);
    }

    const oldProduct = await this.repository.findById(id);
    const product = await this.repository.findByIdAndUpdate(
      id,
      { $set: input },
      { new: true },
    );

    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    await this.cacheInvalidator.invalidateProduct(product, oldProduct || undefined);
    this.logger.log(`Product updated: ${id}`);
    return product;
  }

  async remove(id: string): Promise<Product> {
    return this.archive(id);
  }

  async archive(id: string): Promise<Product> {
    return this.updateArchiveStatus(id, true);
  }

  async unarchive(id: string): Promise<Product> {
    return this.updateArchiveStatus(id, false);
  }

  async updateStock(id: string, quantity: number): Promise<Product> {
    const stockUpdate: StockUpdateParams = {
      stockQuantity: quantity,
      availabilityStatus: quantity > 0 ? 'in_stock' : 'out_of_stock',
    };

    const product = await this.repository.findByIdAndUpdate(
      id,
      { $set: stockUpdate },
      { new: true },
    );

    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    await this.cacheInvalidator.invalidateProduct(product);
    this.logger.log(`Product stock updated: ${id}, quantity: ${quantity}`);
    return product;
  }

  private async resolveSlug(name: string, providedSlug?: string): Promise<string> {
    if (!providedSlug) {
      const baseSlug = this.slugService.generateSlug(name);
      return this.slugService.generateUniqueSlug(
        baseSlug,
        (s) => this.checkSlugExists(s),
      );
    }

    await this.validateSlugUnique(providedSlug);
    return providedSlug;
  }

  private async validateSlugUnique(slug: string, excludeId?: string): Promise<void> {
    if (await this.checkSlugExists(slug, excludeId)) {
      throw new ConflictException(`Product with slug '${slug}' already exists`);
    }
  }

  private async checkSlugExists(slug: string, excludeId?: string): Promise<boolean> {
    const filter = ProductQueryBuilder.forSlugCheck(slug, excludeId);
    const count = await this.repository.countDocuments(filter);
    return count > 0;
  }

  private async updateArchiveStatus(id: string, isArchived: boolean): Promise<Product> {
    const product = await this.repository.findByIdAndUpdate(
      id,
      { $set: { isArchived } },
      { new: true },
    );

    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    await this.cacheInvalidator.invalidateProduct(product);
    this.logger.log(`Product ${isArchived ? 'archived' : 'unarchived'}: ${id}`);
    return product;
  }
}

// ============================================================================
// 10. MAIN PRODUCT SERVICE (Facade Pattern)
// ============================================================================
@Injectable()
export class ProductService {
  private readonly queryService: ProductQueryService;
  private readonly commandService: ProductCommandService;

  constructor(
    @InjectModel(Product.name) productModel: Model<ProductDocument>,
    slugService: SlugService,
    cacheService: CacheService,
    cacheKeyFactory: CacheKeyFactory,
    cacheInvalidatorService: CacheInvalidatorService,
    logger: WinstonLoggerService,
  ) {
    const repository = new ProductRepository(productModel);
    const cacheStrategyFactory = new ProductCacheStrategyFactory(
      cacheService,
      cacheKeyFactory,
    );

    this.queryService = new ProductQueryService(repository, cacheStrategyFactory);
    this.commandService = new ProductCommandService(
      repository,
      slugService,
      cacheInvalidatorService,
      logger,
    );
  }

  // ========== WRITE OPERATIONS ==========
  create(input: CreateProductInput): Promise<Product> {
    return this.commandService.create(input);
  }

  update(id: string, input: UpdateProductInput): Promise<Product> {
    return this.commandService.update(id, input);
  }

  remove(id: string): Promise<Product> {
    return this.commandService.remove(id);
  }

  archive(id: string): Promise<Product> {
    return this.commandService.archive(id);
  }

  unarchive(id: string): Promise<Product> {
    return this.commandService.unarchive(id);
  }

  updateStock(id: string, quantity: number): Promise<Product> {
    return this.commandService.updateStock(id, quantity);
  }

  // ========== READ OPERATIONS ==========
  findAll(includeOutOfStock = true, includeArchived = false): Promise<Product[]> {
    return this.queryService.findAll(includeOutOfStock, includeArchived);
  }

  findOne(id: string, includeArchived = false): Promise<Product> {
    return this.queryService.findOne(id, includeArchived);
  }

  findBySlug(slug: string, includeArchived = false): Promise<Product> {
    return this.queryService.findBySlug(slug, includeArchived);
  }

  findByCategoryId(categoryId: string, includeArchived = false): Promise<Product[]> {
    return this.queryService.findByCategoryId(categoryId, includeArchived);
  }

  searchProducts(searchTerm: string, includeArchived = false): Promise<Product[]> {
    return this.queryService.searchProducts(searchTerm, includeArchived);
  }

  findAllPaginated(
    page = DEFAULT_PAGE,
    limit = DEFAULT_LIMIT,
    includeOutOfStock = true,
    includeArchived = false,
  ): Promise<PaginationResult<Product>> {
    return this.queryService.findAllPaginated(
      page,
      limit,
      includeOutOfStock,
      includeArchived,
    );
  }

  findByCategoryIdPaginated(
    categoryId: string,
    page = DEFAULT_PAGE,
    limit = DEFAULT_LIMIT,
    includeArchived = false,
  ): Promise<PaginationResult<Product>> {
    return this.queryService.findByCategoryIdPaginated(
      categoryId,
      page,
      limit,
      includeArchived,
    );
  }

  searchProductsPaginated(
    searchTerm: string,
    page = DEFAULT_PAGE,
    limit = DEFAULT_LIMIT,
    includeArchived = false,
  ): Promise<PaginationResult<Product>> {
    return this.queryService.searchProductsPaginated(
      searchTerm,
      page,
      limit,
      includeArchived,
    );
  }
}
