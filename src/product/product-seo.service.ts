import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ProductSeo, ProductSeoDocument } from './product-seo.schema';
import { ProductSeoInput } from './product-seo.input';
import { WinstonLoggerService } from '../logger/logger.service';

@Injectable()
export class ProductSeoService {
  constructor(
    @InjectModel(ProductSeo.name) private readonly productSeoModel: Model<ProductSeoDocument>,
    private readonly logger: WinstonLoggerService,
  ) {}

  async findByProductId(productId: string): Promise<ProductSeo | null> {
    return this.productSeoModel.findOne({ productId }).exec();
  }

  async create(productId: string, seoInput: ProductSeoInput): Promise<ProductSeo> {
    const seo = new this.productSeoModel({
      productId,
      ...seoInput,
    });
    const savedSeo = await seo.save();
    this.logger.log(`ProductSeo created for product: ${productId}`);
    return savedSeo;
  }

  async update(productId: string, seoInput: ProductSeoInput): Promise<ProductSeo | null> {
    const seo = await this.productSeoModel.findOneAndUpdate(
      { productId },
      { $set: seoInput },
      { new: true, upsert: true },
    ).exec();
    this.logger.log(`ProductSeo updated for product: ${productId}`);
    return seo;
  }

  async delete(productId: string): Promise<void> {
    await this.productSeoModel.deleteOne({ productId }).exec();
    this.logger.log(`ProductSeo deleted for product: ${productId}`);
  }
}
