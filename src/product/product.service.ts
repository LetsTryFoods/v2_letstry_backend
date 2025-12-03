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
import { SlugUtils } from '../utils/slug.utils';
import { PaginationResult } from '../common/pagination';

@Injectable()
export class ProductService {
  constructor(
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
    private readonly logger: WinstonLoggerService,
  ) {}

  async checkSlugExists(slug: string, excludeId?: string): Promise<boolean> {
    const filter: any = { slug };
    if (excludeId) {
      filter._id = { $ne: excludeId };
    }
    const count = await this.productModel.countDocuments(filter).exec();
    return count > 0;
  }

  async create(createProductInput: CreateProductInput): Promise<Product> {
    let slug = createProductInput.slug;
    if (!slug) {
      slug = SlugUtils.generateSlug(createProductInput.name);
      slug = await SlugUtils.generateUniqueSlug(slug, (s) =>
        this.checkSlugExists(s),
      );
    } else {
      if (await this.checkSlugExists(slug)) {
        throw new ConflictException(
          `Product with slug '${slug}' already exists`,
        );
      }
    }

    const product = new this.productModel({
      ...createProductInput,
      slug,
    });
    const savedProduct = await product.save();
    this.logger.log(`Product created: ${savedProduct._id}`);
    return savedProduct;
  }

  async findAll(
    includeOutOfStock = true,
    includeArchived = false,
  ): Promise<Product[]> {
    const filter: any = includeArchived ? {} : { isArchived: false };
    if (!includeOutOfStock && !filter.isArchived) {
      filter.availabilityStatus = { $ne: 'out_of_stock' };
    } else if (!includeOutOfStock) {
      filter.$and = [
        { isArchived: false },
        { availabilityStatus: { $ne: 'out_of_stock' } },
      ];
    }
    return this.productModel.find(filter).sort({ createdAt: -1 }).exec();
  }

  async findOne(id: string, includeArchived = false): Promise<Product> {
    const filter: any = includeArchived
      ? { _id: id }
      : { _id: id, isArchived: false };
    const product = await this.productModel.findOne(filter).exec();
    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }
    return product;
  }

  async findBySlug(slug: string, includeArchived = false): Promise<Product> {
    const filter: any = includeArchived
      ? { slug }
      : { slug, isArchived: false };
    const product = await this.productModel.findOne(filter).exec();
    if (!product) {
      throw new NotFoundException(`Product with slug ${slug} not found`);
    }
    return product;
  }

  async findByCategoryId(
    categoryId: string,
    includeArchived = false,
  ): Promise<Product[]> {
    const filter: any = includeArchived
      ? { categoryId, availabilityStatus: { $ne: 'out_of_stock' } }
      : {
          categoryId,
          isArchived: false,
          availabilityStatus: { $ne: 'out_of_stock' },
        };
    return this.productModel.find(filter).sort({ createdAt: -1 }).exec();
  }

  async searchProducts(
    searchTerm: string,
    includeArchived = false,
  ): Promise<Product[]> {
    const regex = new RegExp(searchTerm, 'i');
    const filter: any = {
      $or: [
        { name: regex },
        { description: regex },
        { brand: regex },
        { keywords: regex },
        { tags: regex },
      ],
      availabilityStatus: { $ne: 'out_of_stock' },
    };
    if (!includeArchived) {
      filter.isArchived = false;
    }
    return this.productModel.find(filter).sort({ createdAt: -1 }).exec();
  }

  async findAllPaginated(
    page: number = 1,
    limit: number = 10,
    includeOutOfStock = true,
    includeArchived = false,
  ): Promise<PaginationResult<Product>> {
    const filter: any = includeArchived ? {} : { isArchived: false };
    if (!includeOutOfStock && !filter.isArchived) {
      filter.availabilityStatus = { $ne: 'out_of_stock' };
    } else if (!includeOutOfStock) {
      filter.$and = [
        { isArchived: false },
        { availabilityStatus: { $ne: 'out_of_stock' } },
      ];
    }

    const skip = (page - 1) * limit;
    const totalCount = await this.productModel.countDocuments(filter).exec();
    const totalPages = Math.ceil(totalCount / limit);

    const items = await this.productModel
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

  async findByCategoryIdPaginated(
    categoryId: string,
    page: number = 1,
    limit: number = 10,
    includeArchived = false,
  ): Promise<PaginationResult<Product>> {
    const filter: any = includeArchived
      ? { categoryId, availabilityStatus: { $ne: 'out_of_stock' } }
      : {
          categoryId,
          isArchived: false,
          availabilityStatus: { $ne: 'out_of_stock' },
        };

    const skip = (page - 1) * limit;
    const totalCount = await this.productModel.countDocuments(filter).exec();
    const totalPages = Math.ceil(totalCount / limit);

    const items = await this.productModel
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

  async searchProductsPaginated(
    searchTerm: string,
    page: number = 1,
    limit: number = 10,
    includeArchived = false,
  ): Promise<PaginationResult<Product>> {
    const regex = new RegExp(searchTerm, 'i');
    const filter: any = {
      $or: [
        { name: regex },
        { description: regex },
        { brand: regex },
        { keywords: regex },
        { tags: regex },
      ],
      availabilityStatus: { $ne: 'out_of_stock' },
    };
    if (!includeArchived) {
      filter.isArchived = false;
    }

    const skip = (page - 1) * limit;
    const totalCount = await this.productModel.countDocuments(filter).exec();
    const totalPages = Math.ceil(totalCount / limit);

    const items = await this.productModel
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

  async update(
    id: string,
    updateProductInput: UpdateProductInput,
  ): Promise<Product> {
    if (updateProductInput.slug) {
      if (await this.checkSlugExists(updateProductInput.slug, id)) {
        throw new ConflictException(
          `Product with slug '${updateProductInput.slug}' already exists`,
        );
      }
    }

    const product = await this.productModel
      .findByIdAndUpdate(id, { $set: updateProductInput }, { new: true })
      .exec();

    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    this.logger.log(`Product updated: ${id}`);
    return product;
  }

  async remove(id: string): Promise<Product> {
    const product = await this.productModel
      .findByIdAndUpdate(id, { $set: { isArchived: true } }, { new: true })
      .exec();
    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }
    this.logger.log(`Product archived: ${id}`);
    return product;
  }

  async archive(id: string): Promise<Product> {
    const product = await this.productModel
      .findByIdAndUpdate(id, { $set: { isArchived: true } }, { new: true })
      .exec();
    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }
    this.logger.log(`Product archived: ${id}`);
    return product;
  }

  async unarchive(id: string): Promise<Product> {
    const product = await this.productModel
      .findByIdAndUpdate(id, { $set: { isArchived: false } }, { new: true })
      .exec();
    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }
    this.logger.log(`Product unarchived: ${id}`);
    return product;
  }

  async updateStock(id: string, quantity: number): Promise<Product> {
    const product = await this.productModel
      .findByIdAndUpdate(
        id,
        {
          $set: {
            stockQuantity: quantity,
            availabilityStatus: quantity > 0 ? 'in_stock' : 'out_of_stock',
          },
        },
        { new: true },
      )
      .exec();

    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    this.logger.log(`Product stock updated: ${id}, quantity: ${quantity}`);
    return product;
  }
}
