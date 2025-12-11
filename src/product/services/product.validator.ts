import { ConflictException } from '@nestjs/common';
import { ProductRepository } from './product.repository';
import { ProductFilter } from './product.types';

export class ProductVariantValidator {
  static validateVariants(variants: any[]): void {
    if (!variants || variants.length === 0) {
      throw new ConflictException('Product must have at least one variant');
    }

    const defaultVariants = variants.filter(v => v.isDefault);
    if (defaultVariants.length === 0) {
      throw new ConflictException('Product must have exactly one default variant');
    }
    if (defaultVariants.length > 1) {
      throw new ConflictException('Product can have only one default variant');
    }

    const skus = variants.map(v => v.sku);
    const uniqueSkus = new Set(skus);
    if (skus.length !== uniqueSkus.size) {
      throw new ConflictException('All variant SKUs must be unique within the product');
    }
  }

  static async validateSkuUnique(
    repository: ProductRepository,
    sku: string,
    excludeProductId?: string,
  ): Promise<void> {
    const filter: ProductFilter = { 'variants.sku': sku };
    if (excludeProductId) {
      filter._id = { $ne: excludeProductId };
    }
    const count = await repository.countDocuments(filter);
    if (count > 0) {
      throw new ConflictException(`SKU '${sku}' already exists`);
    }
  }
}
