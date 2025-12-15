import { NotFoundException, ConflictException } from '@nestjs/common';
import { Product } from '../product.schema';
import { CreateProductInput, UpdateProductInput } from '../product.input';
import { ProductRepository } from './product.repository';
import { SlugService } from '../../common/services/slug.service';
import { CacheInvalidatorService } from '../../cache/cache-invalidator.service';
import { WinstonLoggerService } from '../../logger/logger.service';
import { ProductVariantValidator } from './product.validator';
import { ProductQueryBuilder } from './product.query-builder';
import { StockUpdateParams } from './product.types';

export class ProductCommandService {
  constructor(
    private readonly repository: ProductRepository,
    private readonly slugService: SlugService,
    private readonly cacheInvalidator: CacheInvalidatorService,
    private readonly logger: WinstonLoggerService,
  ) {}

  async create(input: CreateProductInput): Promise<Product> {
    ProductVariantValidator.validateVariants(input.variants);
    for (const variant of input.variants) {
      await ProductVariantValidator.validateSkuUnique(this.repository, variant.sku);
    }
    const slug = await this.resolveSlug(input.name, input.slug);
    const product = await this.repository.create({
      ...input,
      slug,
      variants: input.variants,  // Let Mongoose generate ObjectIds automatically
    });

    await this.cacheInvalidator.invalidateProduct(product);
    this.logger.log(`Product created: ${product._id}`);
    return product;
  }

  async update(id: string, input: UpdateProductInput): Promise<Product> {
    if (input.slug) {
      await this.validateSlugUnique(input.slug, id);
    }

    if (input.variants) {
      ProductVariantValidator.validateVariants(input.variants);

      for (const variant of input.variants) {
        const currentProduct = await this.repository.findById(id);
        const existingVariant = currentProduct?.variants?.find(v => v._id === variant._id);
        
        if (variant.sku && (!existingVariant || existingVariant.sku !== variant.sku)) {
          await ProductVariantValidator.validateSkuUnique(this.repository, variant.sku, id);
        }
      }
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

  async addVariant(productId: string, variantInput: any): Promise<Product> {
    const product = await this.repository.findById(productId);
    if (!product) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }

    await ProductVariantValidator.validateSkuUnique(this.repository, variantInput.sku);

    const newVariant = {
      ...variantInput,
      _id: new Date().getTime().toString() + Math.random().toString(36).substr(2, 9),
    };

    const updatedVariants = [...product.variants, newVariant];
    ProductVariantValidator.validateVariants(updatedVariants);

    const updatedProduct = await this.repository.findByIdAndUpdate(
      productId,
      { $push: { variants: newVariant } },
      { new: true },
    );

    await this.cacheInvalidator.invalidateProduct(updatedProduct!);
    this.logger.log(`Variant added to product: ${productId}`);
    return updatedProduct!;
  }

  async updateVariant(productId: string, variantId: string, variantUpdate: any): Promise<Product> {
    const product = await this.repository.findById(productId);
    if (!product) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }

    const variantIndex = product.variants.findIndex(v => v._id === variantId);
    if (variantIndex === -1) {
      throw new NotFoundException(`Variant with ID ${variantId} not found`);
    }

    if (variantUpdate.sku && product.variants[variantIndex].sku !== variantUpdate.sku) {
      await ProductVariantValidator.validateSkuUnique(this.repository, variantUpdate.sku, productId);
    }

    const updatedVariants = [...product.variants];
    updatedVariants[variantIndex] = { ...updatedVariants[variantIndex], ...variantUpdate, _id: variantId };

    ProductVariantValidator.validateVariants(updatedVariants);

    const updatedProduct = await this.repository.findByIdAndUpdate(
      productId,
      { $set: { variants: updatedVariants } },
      { new: true },
    );

    await this.cacheInvalidator.invalidateProduct(updatedProduct!);
    this.logger.log(`Variant updated in product: ${productId}, variant: ${variantId}`);
    return updatedProduct!;
  }

  async removeVariant(productId: string, variantId: string): Promise<Product> {
    const product = await this.repository.findById(productId);
    if (!product) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }

    if (product.variants.length === 1) {
      throw new ConflictException('Cannot remove the last variant. Product must have at least one variant');
    }

    const variant = product.variants.find(v => v._id === variantId);
    if (!variant) {
      throw new NotFoundException(`Variant with ID ${variantId} not found`);
    }

    if (variant.isDefault && product.variants.length > 1) {
      throw new ConflictException('Cannot remove default variant. Set another variant as default first');
    }

    const updatedProduct = await this.repository.findByIdAndUpdate(
      productId,
      { $pull: { variants: { _id: variantId } } },
      { new: true },
    );

    await this.cacheInvalidator.invalidateProduct(updatedProduct!);
    this.logger.log(`Variant removed from product: ${productId}, variant: ${variantId}`);
    return updatedProduct!;
  }

  async setDefaultVariant(productId: string, variantId: string): Promise<Product> {
    const product = await this.repository.findById(productId);
    if (!product) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }

    const variantExists = product.variants.some(v => v._id === variantId);
    if (!variantExists) {
      throw new NotFoundException(`Variant with ID ${variantId} not found`);
    }

    const updatedVariants = product.variants.map(v => ({
      ...v,
      isDefault: v._id === variantId,
    }));

    const updatedProduct = await this.repository.findByIdAndUpdate(
      productId,
      { $set: { variants: updatedVariants } },
      { new: true },
    );

    await this.cacheInvalidator.invalidateProduct(updatedProduct!);
    this.logger.log(`Default variant set for product: ${productId}, variant: ${variantId}`);
    return updatedProduct!;
  }

  async updateVariantStock(productId: string, variantId: string, quantity: number): Promise<Product> {
    const product = await this.repository.findById(productId);
    if (!product) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }

    const variantIndex = product.variants.findIndex(v => v._id === variantId);
    if (variantIndex === -1) {
      throw new NotFoundException(`Variant with ID ${variantId} not found`);
    }

    const updatedVariants = [...product.variants];
    updatedVariants[variantIndex] = {
      ...updatedVariants[variantIndex],
      stockQuantity: quantity,
      availabilityStatus: quantity > 0 ? 'in_stock' : 'out_of_stock',
    };

    const updatedProduct = await this.repository.findByIdAndUpdate(
      productId,
      { $set: { variants: updatedVariants } },
      { new: true },
    );

    await this.cacheInvalidator.invalidateProduct(updatedProduct!);
    this.logger.log(`Variant stock updated: ${productId}, variant: ${variantId}, quantity: ${quantity}`);
    return updatedProduct!;
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
