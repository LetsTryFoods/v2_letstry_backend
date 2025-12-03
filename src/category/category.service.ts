import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Category, CategoryDocument } from './category.schema';
import { CreateCategoryInput, UpdateCategoryInput } from './category.input';
import { SlugUtils } from '../utils/slug.utils';
import { PaginationResult } from '../common/pagination';

@Injectable()
export class CategoryService {
  constructor(
    @InjectModel(Category.name) private categoryModel: Model<CategoryDocument>,
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
      slug = SlugUtils.generateSlug(input.name);
      slug = await SlugUtils.generateUniqueSlug(slug, (s) =>
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
    return category.save();
  }

  async findAll(includeArchived = false): Promise<Category[]> {
    const filter = includeArchived ? {} : { isArchived: false };
    return this.categoryModel.find(filter).exec();
  }

  async findOne(id: string, includeArchived = false): Promise<Category | null> {
    const filter = includeArchived
      ? { _id: id }
      : { _id: id, isArchived: false };
    return this.categoryModel.findOne(filter).exec();
  }

  async findBySlug(
    slug: string,
    includeArchived = false,
  ): Promise<Category | null> {
    const filter = includeArchived ? { slug } : { slug, isArchived: false };
    return this.categoryModel.findOne(filter).exec();
  }

  async findChildren(
    parentId: string,
    includeArchived = false,
  ): Promise<Category[]> {
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
    return category;
  }

  async archive(id: string): Promise<Category> {
    const category = await this.categoryModel
      .findByIdAndUpdate(id, { isArchived: true }, { new: true })
      .exec();
    if (!category) {
      throw new NotFoundException(`Category with id ${id} not found`);
    }
    return category;
  }

  async unarchive(id: string): Promise<Category> {
    const category = await this.categoryModel
      .findByIdAndUpdate(id, { isArchived: false }, { new: true })
      .exec();
    if (!category) {
      throw new NotFoundException(`Category with id ${id} not found`);
    }
    return category;
  }

  async remove(id: string): Promise<Category> {
    const category = await this.categoryModel.findByIdAndDelete(id).exec();
    if (!category) {
      throw new NotFoundException(`Category with id ${id} not found`);
    }
    return category;
  }

  async incrementProductCount(id: string): Promise<void> {
    await this.categoryModel
      .updateOne({ _id: id }, { $inc: { productCount: 1 } })
      .exec();
  }

  async decrementProductCount(id: string): Promise<void> {
    await this.categoryModel
      .updateOne({ _id: id }, { $inc: { productCount: -1 } })
      .exec();
  }
}
