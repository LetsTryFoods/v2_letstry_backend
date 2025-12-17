import { Injectable } from '@nestjs/common';
import { CacheService } from './cache.service';
import { CacheKeyFactory } from './cache-key.factory';
import { Product } from '../product/product.schema';
import { Category } from '../category/category.schema';
import { Policy } from '../policy/policy.schema';

@Injectable()
export class CacheInvalidatorService {
  constructor(
    private readonly cacheService: CacheService,
    private readonly cacheKeyFactory: CacheKeyFactory,
  ) {}

  /**
   * Invalidate cache when a product is created, updated, or deleted.
   */
  async invalidateProduct(newProduct: Product, oldProduct?: Product) {
    if (newProduct._id) {
        await this.cacheService.bumpVersion(this.cacheKeyFactory.getProductDetailVersionKey(newProduct._id.toString()));
    }
    if (newProduct.slug) {
        await this.cacheService.bumpVersion(this.cacheKeyFactory.getProductDetailVersionKey(newProduct.slug));
    }

    await this.cacheService.bumpVersion(this.cacheKeyFactory.getProductGlobalListVersionKey());

    if (newProduct.categoryIds && newProduct.categoryIds.length > 0) {
      for (const categoryId of newProduct.categoryIds) {
        const listVersionKey = this.cacheKeyFactory.getProductListVersionKey(categoryId);
        await this.cacheService.bumpVersion(listVersionKey);
      }
    }

    if (oldProduct && oldProduct.categoryIds) {
      const removedCategories = oldProduct.categoryIds.filter(
        id => !newProduct.categoryIds || !newProduct.categoryIds.includes(id)
      );
      for (const categoryId of removedCategories) {
        const oldListVersionKey = this.cacheKeyFactory.getProductListVersionKey(categoryId);
        await this.cacheService.bumpVersion(oldListVersionKey);
      }
    }
  }

  async invalidateCategory(slug: string) {
    // Invalidate Category List
    await this.cacheService.bumpVersion(this.cacheKeyFactory.getCategoryListVersionKey());
    
    // Invalidate Category Detail
    await this.cacheService.bumpVersion(this.cacheKeyFactory.getCategoryDetailVersionKey(slug));
    
    // NOTE: If a category changes (e.g. name/slug), do we invalidate products?
    // Usually yes, but that might be expensive. For now, we stick to category keys.
  }

  async invalidateBanner() {
    await this.cacheService.bumpVersion(this.cacheKeyFactory.getBannerListVersionKey());
  }

  async invalidatePolicy(policy: Policy) {
    await this.cacheService.bumpVersion(this.cacheKeyFactory.getPolicyListVersionKey());
    if (policy._id) await this.cacheService.bumpVersion(this.cacheKeyFactory.getPolicyDetailVersionKey(policy._id.toString()));
    if (policy.title) await this.cacheService.bumpVersion(this.cacheKeyFactory.getPolicyDetailVersionKey(policy.title));
    if (policy.type) await this.cacheService.bumpVersion(this.cacheKeyFactory.getPolicyDetailVersionKey(policy.type));
  }
}
