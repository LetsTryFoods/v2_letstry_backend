import { Model } from 'mongoose';
import { Product, ProductDocument } from '../product.schema';
import { ProductFilter } from './product.types';

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
