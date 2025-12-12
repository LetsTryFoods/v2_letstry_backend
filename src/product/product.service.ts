import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Product, ProductDocument } from './product.schema';
import { ProductSeo } from './product-seo.schema';
import { ProductSeoService } from './product-seo.service';
import { CreateProductInput, UpdateProductInput } from './product.input';
import { WinstonLoggerService } from '../logger/logger.service';
import { SlugService } from '../common/services/slug.service';
import { PaginationResult } from '../common/pagination';
import { CacheService } from '../cache/cache.service';
import { CacheKeyFactory } from '../cache/cache-key.factory';
import { CacheInvalidatorService } from '../cache/cache-invalidator.service';
import { ProductRepository } from './services/product.repository';
import { ProductCacheStrategyFactory } from './services/product.cache-factory';
import { ProductQueryService } from './services/product.query-service';
import { ProductCommandService } from './services/product.command-service';
import { DEFAULT_PAGE, DEFAULT_LIMIT } from './services/product.types';

@Injectable()
export class ProductService {
  private readonly queryService: ProductQueryService;
  private readonly commandService: ProductCommandService;

  constructor(
    @InjectModel(Product.name) productModel: Model<ProductDocument>,
    private readonly productSeoService: ProductSeoService,
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

  async create(input: CreateProductInput): Promise<Product> {
    const product = await this.commandService.create(input);
    if (input.seo) {
      await this.productSeoService.create(product._id, input.seo);
    }
    return product;
  }

  async update(id: string, input: UpdateProductInput): Promise<Product> {
    const product = await this.commandService.update(id, input);
    if (input.seo) {
      await this.productSeoService.update(product._id, input.seo);
    }
    return product;
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

  findByVariantId(variantId: string, includeArchived = false): Promise<Product> {
    return this.queryService.findByVariantId(variantId, includeArchived);
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

  countByCategoryId(
    categoryId: string,
    includeArchived = false,
  ): Promise<number> {
    return this.queryService.countByCategoryId(categoryId, includeArchived);
  }

  addVariant(productId: string, variantInput: any): Promise<Product> {
    return this.commandService.addVariant(productId, variantInput);
  }

  updateVariant(productId: string, variantId: string, variantUpdate: any): Promise<Product> {
    return this.commandService.updateVariant(productId, variantId, variantUpdate);
  }

  removeVariant(productId: string, variantId: string): Promise<Product> {
    return this.commandService.removeVariant(productId, variantId);
  }

  setDefaultVariant(productId: string, variantId: string): Promise<Product> {
    return this.commandService.setDefaultVariant(productId, variantId);
  }

  updateVariantStock(productId: string, variantId: string, quantity: number): Promise<Product> {
    return this.commandService.updateVariantStock(productId, variantId, quantity);
  }

  findSeoByProductId(productId: string): Promise<ProductSeo | null> {
    return this.productSeoService.findByProductId(productId);
  }
}
