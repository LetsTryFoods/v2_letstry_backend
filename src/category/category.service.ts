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

@Injectable()
export class CategoryService {
  constructor(
    @InjectModel(Category.name) private categoryModel: Model<CategoryDocument>,
    private readonly slugService: SlugService,
    private readonly cacheService: CacheService,
    private readonly cacheKeyFactory: CacheKeyFactory,
    private readonly cacheInvalidatorService: CacheInvalidatorService,
  ) {}

  async checkSlugExists(slug: string, excludeId?: string): Promise<boolean> {
    const filter: any = { slug };
    if (excludeId) {
      filter._id = { $ne: excludeId };
    }
    const count = await this.categoryModel.countDocuments(filter).exec();
    return count > 0;
  }

  async create(input: CreateCategoryInput): Promise<Category> {
    let slug = input.slug;
    if (!slug) {
      slug = this.slugService.generateSlug(input.name);
      slug = await this.slugService.generateUniqueSlug(slug, (s) =>
        this.checkSlugExists(s),
      );
    } else {
      if (await this.checkSlugExists(slug)) {
        throw new ConflictException(
          `Category with slug '${slug}' already exists`,
        );
      }
    }

    const category = new this.categoryModel({
      ...input,
      slug,
      productCount: 0,
      isArchived: input.isArchived ?? false,
    });
    const savedCategory = await category.save();
    await this.cacheInvalidatorService.invalidateCategory(savedCategory.slug);
    return savedCategory;
  }

  async findAll(includeArchived = false): Promise<Category[]> {
    // Only cache non-archived (public) lists for now to keep it simple
    if (!includeArchived) {
      const versionKey = this.cacheKeyFactory.getCategoryListVersionKey();
      const version = await this.cacheService.getVersion(versionKey);
      const key = this.cacheKeyFactory.getCategoryListKey(version);

      const cached = await this.cacheService.get<Category[]>(key);
      if (cached) return cached;

      const data = await this.categoryModel.find({ isArchived: false }).exec();
      await this.cacheService.set(key, data);
      return data;
    }

    const filter = includeArchived ? {} : { isArchived: false };
    return this.categoryModel.find(filter).exec();
  }

  async findOne(id: string, includeArchived = false): Promise<Category | null> {
    // Caching by ID is tricky if we primarily use slugs. 
    // We'll skip caching ID lookups for now unless critical, 
    // or we can map ID -> Slug -> Cache, but that's complex.
    const filter = includeArchived
      ? { _id: id }
      : { _id: id, isArchived: false };
    return this.categoryModel.findOne(filter).exec();
  }

  async findBySlug(
    slug: string,
    includeArchived = false,
  ): Promise<Category | null> {
    if (!includeArchived) {
      const versionKey = this.cacheKeyFactory.getCategoryDetailVersionKey(slug);
      const version = await this.cacheService.getVersion(versionKey);
      const key = this.cacheKeyFactory.getCategoryDetailKey(slug, version);

      const cached = await this.cacheService.get<Category>(key);
      if (cached) return cached;

      const data = await this.categoryModel.findOne({ slug, isArchived: false }).exec();
      if (data) {
        await this.cacheService.set(key, data);
      }
      return data;
    }

    const filter = includeArchived ? { slug } : { slug, isArchived: false };
    return this.categoryModel.findOne(filter).exec();
  }

  async findChildren(
    parentId: string,
    includeArchived = false,
  ): Promise<Category[]> {
    // Caching children lists could be done with a specific key pattern like category:children:{parentId}
    // For now, we'll leave this uncached or rely on the main list cache if the client filters there.
    const filter = includeArchived
      ? { parentId }
      : { parentId, isArchived: false };
    return this.categoryModel.find(filter).exec();
  }

  async findRootCategories(includeArchived = false): Promise<Category[]> {
    const filter = includeArchived
      ? { parentId: null }
      : { parentId: null, isArchived: false };
    return this.categoryModel.find(filter).exec();
  }

  async findAllPaginated(
    page: number = 1,
    limit: number = 10,
    includeArchived = false,
  ): Promise<PaginationResult<Category>> {
    const filter = includeArchived ? {} : { isArchived: false };

    const skip = (page - 1) * limit;
    const totalCount = await this.categoryModel.countDocuments(filter).exec();
    const totalPages = Math.ceil(totalCount / limit);

    const items = await this.categoryModel
      .find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec();

    return {
      items,
      meta: {
        totalCount,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  async findChildrenPaginated(
    parentId: string,
    page: number = 1,
    limit: number = 10,
    includeArchived = false,
  ): Promise<PaginationResult<Category>> {
    const filter = includeArchived
      ? { parentId }
      : { parentId, isArchived: false };

    const skip = (page - 1) * limit;
    const totalCount = await this.categoryModel.countDocuments(filter).exec();
    const totalPages = Math.ceil(totalCount / limit);

    const items = await this.categoryModel
      .find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec();

    return {
      items,
      meta: {
        totalCount,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  async findRootCategoriesPaginated(
    page: number = 1,
    limit: number = 10,
    includeArchived = false,
  ): Promise<PaginationResult<Category>> {
    const filter = includeArchived
      ? { parentId: null }
      : { parentId: null, isArchived: false };

    const skip = (page - 1) * limit;
    const totalCount = await this.categoryModel.countDocuments(filter).exec();
    const totalPages = Math.ceil(totalCount / limit);

    const items = await this.categoryModel
      .find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec();

    return {
      items,
      meta: {
        totalCount,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  async update(id: string, input: UpdateCategoryInput): Promise<Category> {
    if (input.slug) {
      if (await this.checkSlugExists(input.slug, id)) {
        throw new ConflictException(
          `Category with slug '${input.slug}' already exists`,
        );
      }
    }

    const category = await this.categoryModel
      .findByIdAndUpdate(id, input, { new: true })
      .exec();
    if (!category) {
      throw new NotFoundException(`Category with id ${id} not found`);
    }
    await this.cacheInvalidatorService.invalidateCategory(category.slug);
    return category;
  }

  async archive(id: string): Promise<Category> {
    const category = await this.categoryModel
      .findByIdAndUpdate(id, { isArchived: true }, { new: true })
      .exec();
    if (!category) {
      throw new NotFoundException(`Category with id ${id} not found`);
    }
    await this.cacheInvalidatorService.invalidateCategory(category.slug);
    return category;
  }

  async unarchive(id: string): Promise<Category> {
    const category = await this.categoryModel
      .findByIdAndUpdate(id, { isArchived: false }, { new: true })
      .exec();
    if (!category) {
      throw new NotFoundException(`Category with id ${id} not found`);
    }
    await this.cacheInvalidatorService.invalidateCategory(category.slug);
    return category;
  }

  async remove(id: string): Promise<Category> {
    const category = await this.categoryModel.findByIdAndDelete(id).exec();
    if (!category) {
      throw new NotFoundException(`Category with id ${id} not found`);
    }
    await this.cacheInvalidatorService.invalidateCategory(category.slug);
    return category;
  }

  async incrementProductCount(id: string): Promise<void> {
    await this.categoryModel
      .updateOne({ _id: id }, { $inc: { productCount: 1 } })
      .exec();
    // Note: We might want to invalidate cache here too if product count is displayed in cached lists
    // But frequent updates might thrash the cache. 
    // For now, we'll assume product count updates don't need immediate cache invalidation 
    // or we can invalidate the specific category detail if needed.
  }

  async decrementProductCount(id: string): Promise<void> {
    await this.categoryModel
      .updateOne({ _id: id }, { $inc: { productCount: -1 } })
      .exec();
  }
}
