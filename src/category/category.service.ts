import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Category, CategoryDocument } from './category.schema';
import { CreateCategoryInput, UpdateCategoryInput } from './category.input';
import { SlugService } from '../common/services/slug.service';
import { PaginationResult } from '../common/pagination';
import { CacheService } from '../cache/cache.service';
import { CacheKeyFactory } from '../cache/cache-key.factory';
import { CacheInvalidatorService } from '../cache/cache-invalidator.service';

// ============================================================================
// 1. CONSTANTS & TYPES
// ============================================================================
export const CATEGORY_CACHE_TTL = 15552000000;
export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 10;

// ============================================================================
// 2. QUERY FILTER BUILDER (Single Responsibility)
// ============================================================================
export class CategoryQueryBuilder {
  private filter: any = {};

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

  withParentId(parentId: string | null): this {
    this.filter.parentId = parentId;
    return this;
  }

  excludeId(id: string): this {
    this.filter._id = { $ne: id };
    return this;
  }

  build(): any {
    return this.filter;
  }
}

// ============================================================================
// 3. CACHE DECORATOR (Separation of Concerns)
// ============================================================================
export class CategoryCacheDecorator {
  constructor(
    private readonly cacheService: CacheService,
    private readonly cacheKeyFactory: CacheKeyFactory,
    private readonly ttl: number = CATEGORY_CACHE_TTL,
  ) {}

  async withCache<T>(
    versionKey: string,
    dataKey: (version: string) => string,
    fetchData: () => Promise<T>,
  ): Promise<T> {
    const version = await this.cacheService.getVersion(versionKey);
    const key = dataKey(version.toString());

    const cached = await this.cacheService.get<T>(key);
    if (cached) return cached;

    const data = await fetchData();
    if (data) {
      await this.cacheService.set(key, data, this.ttl);
    }
    return data;
  }

  async withCacheOrNull<T>(
    versionKey: string,
    dataKey: (version: string) => string,
    fetchData: () => Promise<T | null>,
  ): Promise<T | null> {
    const version = await this.cacheService.getVersion(versionKey);
    const key = dataKey(version.toString());

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
// 4. PAGINATION HELPER (DRY Principle)
// ============================================================================
export class PaginationHelper {
  static calculatePagination(page: number, limit: number, totalCount: number) {
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
  ): PaginationResult<T> {
    const { totalPages, hasNextPage, hasPreviousPage } = 
      this.calculatePagination(page, limit, totalCount);
    
    return {
      items,
      meta: {
        totalCount,
        page,
        limit,
        totalPages,
        hasNextPage,
        hasPreviousPage,
      },
    };
  }
}

// ============================================================================
// 5. CATEGORY REPOSITORY (Data Access Layer)
// ============================================================================
export class CategoryRepository {
  constructor(
    private readonly categoryModel: Model<CategoryDocument>,
  ) {}

  async countDocuments(filter: any): Promise<number> {
    return this.categoryModel.countDocuments(filter).exec();
  }

  async find(filter: any): Promise<Category[]> {
    return this.categoryModel.find(filter).exec();
  }

  async findOne(filter: any): Promise<Category | null> {
    return this.categoryModel.findOne(filter).exec();
  }

  async findPaginated(
    filter: any,
    skip: number,
    limit: number,
  ): Promise<Category[]> {
    return this.categoryModel
      .find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec();
  }

  async create(data: any): Promise<Category> {
    const category = new this.categoryModel(data);
    return category.save();
  }

  async findByIdAndUpdate(
    id: string,
    update: any,
    options?: any,
  ): Promise<Category | null> {
    return this.categoryModel.findByIdAndUpdate(id, update, options).exec();
  }

  async findByIdAndDelete(id: string): Promise<Category | null> {
    return this.categoryModel.findByIdAndDelete(id).exec();
  }

  async findById(id: string): Promise<Category | null> {
    return this.categoryModel.findById(id).exec();
  }

  async updateOne(filter: any, update: any): Promise<void> {
    await this.categoryModel.updateOne(filter, update).exec();
  }
}

// ============================================================================
// 6. CATEGORY QUERY SERVICE (Query Operations)
// ============================================================================
export class CategoryQueryService {
  constructor(
    private readonly repository: CategoryRepository,
    private readonly cacheDecorator: CategoryCacheDecorator,
    private readonly cacheKeyFactory: CacheKeyFactory,
  ) {}

  async findAll(includeArchived: boolean): Promise<Category[]> {
    const filter = new CategoryQueryBuilder()
      .withArchived(includeArchived)
      .build();

    if (!includeArchived) {
      return this.cacheDecorator.withCache(
        this.cacheKeyFactory.getCategoryListVersionKey(),
        (version) => this.cacheKeyFactory.getCategoryListKey(parseInt(version)),
        () => this.repository.find(filter),
      );
    }

    return this.repository.find(filter);
  }

  async findOne(id: string, includeArchived: boolean): Promise<Category | null> {
    const filter = new CategoryQueryBuilder()
      .withId(id)
      .withArchived(includeArchived)
      .build();

    if (!includeArchived) {
      return this.cacheDecorator.withCacheOrNull(
        this.cacheKeyFactory.getCategoryDetailVersionKey(id),
        (version) => this.cacheKeyFactory.getCategoryDetailKey(id, parseInt(version)),
        () => this.repository.findOne(filter),
      );
    }

    return this.repository.findOne(filter);
  }

  async findBySlug(slug: string, includeArchived: boolean): Promise<Category | null> {
    const filter = new CategoryQueryBuilder()
      .withSlug(slug)
      .withArchived(includeArchived)
      .build();

    if (!includeArchived) {
      return this.cacheDecorator.withCacheOrNull(
        this.cacheKeyFactory.getCategoryDetailVersionKey(slug),
        (version) => this.cacheKeyFactory.getCategoryDetailKey(slug, parseInt(version)),
        () => this.repository.findOne(filter),
      );
    }

    return this.repository.findOne(filter);
  }

  async findChildren(parentId: string, includeArchived: boolean): Promise<Category[]> {
    const filter = new CategoryQueryBuilder()
      .withParentId(parentId)
      .withArchived(includeArchived)
      .build();

    if (!includeArchived) {
      return this.cacheDecorator.withCache(
        this.cacheKeyFactory.getCategoryListVersionKey(),
        (version) => this.cacheKeyFactory.getCategoryChildrenKey(parentId, parseInt(version)),
        () => this.repository.find(filter),
      );
    }

    return this.repository.find(filter);
  }

  async findRootCategories(includeArchived: boolean): Promise<Category[]> {
    const filter = new CategoryQueryBuilder()
      .withParentId(null)
      .withArchived(includeArchived)
      .build();

    if (!includeArchived) {
      return this.cacheDecorator.withCache(
        this.cacheKeyFactory.getCategoryListVersionKey(),
        (version) => this.cacheKeyFactory.getCategoryRootsKey(parseInt(version)),
        () => this.repository.find(filter),
      );
    }

    return this.repository.find(filter);
  }

  async findAllPaginated(
    page: number,
    limit: number,
    includeArchived: boolean,
  ): Promise<PaginationResult<Category>> {
    const filter = new CategoryQueryBuilder()
      .withArchived(includeArchived)
      .build();

    return this.executePaginatedQuery(
      filter,
      page,
      limit,
      includeArchived,
      this.cacheKeyFactory.getCategoryListVersionKey(),
      (version) => this.cacheKeyFactory.getCategoryListPaginatedKey(page, limit, parseInt(version)),
    );
  }

  async findChildrenPaginated(
    parentId: string,
    page: number,
    limit: number,
    includeArchived: boolean,
  ): Promise<PaginationResult<Category>> {
    const filter = new CategoryQueryBuilder()
      .withParentId(parentId)
      .withArchived(includeArchived)
      .build();

    return this.executePaginatedQuery(
      filter,
      page,
      limit,
      includeArchived,
      this.cacheKeyFactory.getCategoryListVersionKey(),
      (version) => this.cacheKeyFactory.getCategoryChildrenPaginatedKey(parentId, page, limit, parseInt(version)),
    );
  }

  async findRootCategoriesPaginated(
    page: number,
    limit: number,
    includeArchived: boolean,
  ): Promise<PaginationResult<Category>> {
    const filter = new CategoryQueryBuilder()
      .withParentId(null)
      .withArchived(includeArchived)
      .build();

    return this.executePaginatedQuery(
      filter,
      page,
      limit,
      includeArchived,
      this.cacheKeyFactory.getCategoryListVersionKey(),
      (version) => this.cacheKeyFactory.getCategoryRootsPaginatedKey(page, limit, parseInt(version)),
    );
  }

  private async executePaginatedQuery(
    filter: any,
    page: number,
    limit: number,
    includeArchived: boolean,
    versionKey: string,
    dataKeyFactory: (version: string) => string,
  ): Promise<PaginationResult<Category>> {
    if (!includeArchived) {
      return this.cacheDecorator.withCache(
        versionKey,
        dataKeyFactory,
        async () => {
          const totalCount = await this.repository.countDocuments(filter);
          const { skip } = PaginationHelper.calculatePagination(page, limit, totalCount);
          const items = await this.repository.findPaginated(filter, skip, limit);
          return PaginationHelper.createResult(items, page, limit, totalCount);
        },
      );
    }

    const totalCount = await this.repository.countDocuments(filter);
    const { skip } = PaginationHelper.calculatePagination(page, limit, totalCount);
    const items = await this.repository.findPaginated(filter, skip, limit);
    return PaginationHelper.createResult(items, page, limit, totalCount);
  }
}

// ============================================================================
// 7. CATEGORY COMMAND SERVICE (Write Operations)
// ============================================================================
export class CategoryCommandService {
  constructor(
    private readonly repository: CategoryRepository,
    private readonly slugService: SlugService,
    private readonly cacheInvalidator: CacheInvalidatorService,
    private readonly productModel?: Model<any>,
  ) {}

  async create(input: CreateCategoryInput): Promise<Category> {
    const slug = await this.resolveSlug(input.name, input.slug);

    const category = await this.repository.create({
      ...input,
      slug,
      productCount: 0,
      isArchived: input.isArchived ?? false,
    });

    await this.cacheInvalidator.invalidateCategory(category.slug);
    return category;
  }

  async update(id: string, input: UpdateCategoryInput): Promise<Category> {
    if (input.slug) {
      await this.validateSlugUnique(input.slug, id);
    }

    const category = await this.repository.findByIdAndUpdate(
      id,
      input,
      { new: true },
    );

    if (!category) {
      throw new NotFoundException(`Category with id ${id} not found`);
    }

    await this.cacheInvalidator.invalidateCategory(category.slug);
    return category;
  }

  async archive(id: string): Promise<Category> {
    return this.updateArchiveStatus(id, true);
  }

  async unarchive(id: string): Promise<Category> {
    return this.updateArchiveStatus(id, false);
  }

  async remove(id: string): Promise<Category> {
    const category = await this.repository.findByIdAndDelete(id);
    if (!category) {
      throw new NotFoundException(`Category with id ${id} not found`);
    }

    await this.cacheInvalidator.invalidateCategory(category.slug);
    return category;
  }

  async incrementProductCount(id: string): Promise<void> {
    await this.updateProductCount(id, 1);
  }

  async decrementProductCount(id: string): Promise<void> {
    await this.updateProductCount(id, -1);
  }

  async addProductsToCategory(categoryId: string, productIds: string[]): Promise<boolean> {
    await this.validateCategoryExists(categoryId);
    await this.validateProductsExist(productIds);

    const result = await this.addCategoryToProducts(categoryId, productIds);
    await this.updateCategoryProductCount(categoryId);
    await this.invalidateCategoryCache(categoryId);

    return result;
  }

  async removeProductsFromCategory(categoryId: string, productIds: string[]): Promise<boolean> {
    await this.validateCategoryExists(categoryId);

    const result = await this.removeCategoryFromProducts(categoryId, productIds);
    await this.updateCategoryProductCount(categoryId);
    await this.invalidateCategoryCache(categoryId);

    return result;
  }

  private async validateCategoryExists(categoryId: string): Promise<void> {
    const category = await this.repository.findById(categoryId);
    if (!category) {
      throw new NotFoundException(`Category with id ${categoryId} not found`);
    }
  }

  private async validateProductsExist(productIds: string[]): Promise<void> {
    if (!this.productModel) {
      throw new Error('Product model not available');
    }

    const products = await this.productModel.find({ _id: { $in: productIds } }).exec();
    if (products.length !== productIds.length) {
      throw new NotFoundException('One or more products not found');
    }
  }

  private async addCategoryToProducts(categoryId: string, productIds: string[]): Promise<boolean> {
    if (!this.productModel) {
      throw new Error('Product model not available');
    }

    const result = await this.productModel.updateMany(
      { _id: { $in: productIds } },
      { $addToSet: { categoryIds: categoryId } }
    ).exec();

    return result.modifiedCount > 0;
  }

  private async removeCategoryFromProducts(categoryId: string, productIds: string[]): Promise<boolean> {
    if (!this.productModel) {
      throw new Error('Product model not available');
    }

    const result = await this.productModel.updateMany(
      { _id: { $in: productIds } },
      { $pull: { categoryIds: categoryId } }
    ).exec();

    return result.modifiedCount > 0;
  }

  private async updateCategoryProductCount(categoryId: string): Promise<void> {
    if (!this.productModel) {
      return;
    }

    const count = await this.productModel.countDocuments({
      categoryIds: categoryId
    }).exec();

    await this.repository.updateOne(
      { _id: categoryId },
      { productCount: count }
    );
  }

  private async invalidateCategoryCache(categoryId: string): Promise<void> {
    const category = await this.repository.findById(categoryId);
    if (category) {
      await this.cacheInvalidator.invalidateCategory(category.slug);
    }
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
      throw new ConflictException(`Category with slug '${slug}' already exists`);
    }
  }

  private async checkSlugExists(slug: string, excludeId?: string): Promise<boolean> {
    const builder = new CategoryQueryBuilder().withSlug(slug);
    if (excludeId) {
      builder.excludeId(excludeId);
    }
    const count = await this.repository.countDocuments(builder.build());
    return count > 0;
  }

  private async updateArchiveStatus(id: string, isArchived: boolean): Promise<Category> {
    const category = await this.repository.findByIdAndUpdate(
      id,
      { isArchived },
      { new: true },
    );

    if (!category) {
      throw new NotFoundException(`Category with id ${id} not found`);
    }

    await this.cacheInvalidator.invalidateCategory(category.slug);
    return category;
  }

  private async updateProductCount(id: string, increment: number): Promise<void> {
    await this.repository.updateOne(
      { _id: id },
      { $inc: { productCount: increment } },
    );

    const category = await this.repository.findById(id);
    if (category) {
      await this.cacheInvalidator.invalidateCategory(category.slug);
    }
  }
}

// ============================================================================
// 8. MAIN CATEGORY SERVICE (Facade Pattern)
// ============================================================================
@Injectable()
export class CategoryService {
  private readonly queryService: CategoryQueryService;
  private readonly commandService: CategoryCommandService;

  constructor(
    @InjectModel(Category.name) private categoryModel: Model<CategoryDocument>,
    @InjectModel('Product') private productModel: Model<any>,
    private readonly slugService: SlugService,
    private readonly cacheService: CacheService,
    private readonly cacheKeyFactory: CacheKeyFactory,
    private readonly cacheInvalidatorService: CacheInvalidatorService,
  ) {
    const repository = new CategoryRepository(categoryModel);
    const cacheDecorator = new CategoryCacheDecorator(
      cacheService,
      cacheKeyFactory,
      CATEGORY_CACHE_TTL,
    );

    this.queryService = new CategoryQueryService(
      repository,
      cacheDecorator,
      cacheKeyFactory,
    );

    this.commandService = new CategoryCommandService(
      repository,
      slugService,
      cacheInvalidatorService,
      productModel,
    );
  }

  // ========== WRITE OPERATIONS ==========
  async create(input: CreateCategoryInput): Promise<Category> {
    return this.commandService.create(input);
  }

  async update(id: string, input: UpdateCategoryInput): Promise<Category> {
    return this.commandService.update(id, input);
  }

  async archive(id: string): Promise<Category> {
    return this.commandService.archive(id);
  }

  async unarchive(id: string): Promise<Category> {
    return this.commandService.unarchive(id);
  }

  async remove(id: string): Promise<Category> {
    return this.commandService.remove(id);
  }

  async incrementProductCount(id: string): Promise<void> {
    return this.commandService.incrementProductCount(id);
  }

  async decrementProductCount(id: string): Promise<void> {
    return this.commandService.decrementProductCount(id);
  }

  async addProductsToCategory(categoryId: string, productIds: string[]): Promise<boolean> {
    return this.commandService.addProductsToCategory(categoryId, productIds);
  }

  async removeProductsFromCategory(categoryId: string, productIds: string[]): Promise<boolean> {
    return this.commandService.removeProductsFromCategory(categoryId, productIds);
  }

  // ========== READ OPERATIONS ==========
  async findAll(includeArchived = false): Promise<Category[]> {
    return this.queryService.findAll(includeArchived);
  }

  async findOne(id: string, includeArchived = false): Promise<Category | null> {
    return this.queryService.findOne(id, includeArchived);
  }

  async findBySlug(slug: string, includeArchived = false): Promise<Category | null> {
    return this.queryService.findBySlug(slug, includeArchived);
  }

  async findChildren(parentId: string, includeArchived = false): Promise<Category[]> {
    return this.queryService.findChildren(parentId, includeArchived);
  }

  async findRootCategories(includeArchived = false): Promise<Category[]> {
    return this.queryService.findRootCategories(includeArchived);
  }

  async findAllPaginated(
    page: number = DEFAULT_PAGE,
    limit: number = DEFAULT_LIMIT,
    includeArchived = false,
  ): Promise<PaginationResult<Category>> {
    return this.queryService.findAllPaginated(page, limit, includeArchived);
  }

  async findChildrenPaginated(
    parentId: string,
    page: number = DEFAULT_PAGE,
    limit: number = DEFAULT_LIMIT,
    includeArchived = false,
  ): Promise<PaginationResult<Category>> {
    return this.queryService.findChildrenPaginated(parentId, page, limit, includeArchived);
  }

  async findRootCategoriesPaginated(
    page: number = DEFAULT_PAGE,
    limit: number = DEFAULT_LIMIT,
    includeArchived = false,
  ): Promise<PaginationResult<Category>> {
    return this.queryService.findRootCategoriesPaginated(page, limit, includeArchived);
  }
}
