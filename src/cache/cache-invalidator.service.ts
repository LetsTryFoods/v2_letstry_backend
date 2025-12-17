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
    // 1. Invalidate Product Detail (ID and Slug)
    if (newProduct._id) {
        await this.cacheService.bumpVersion(this.cacheKeyFactory.getProductDetailVersionKey(newProduct._id.toString()));
    }
    if (newProduct.slug) {
        await this.cacheService.bumpVersion(this.cacheKeyFactory.getProductDetailVersionKey(newProduct.slug));
    }

    // 2. Invalidate Global List
    await this.cacheService.bumpVersion(this.cacheKeyFactory.getProductGlobalListVersionKey());

    // 3. Invalidate List for New Category
    if (newProduct.categoryId) {
         const listVersionKey = this.cacheKeyFactory.getProductListVersionKey(newProduct.categoryId);
         await this.cacheService.bumpVersion(listVersionKey);
    }

    // 4. Invalidate List for Old Category (if changed)
    if (oldProduct && oldProduct.categoryId !== newProduct.categoryId) {
       if (oldProduct.categoryId) {
          const oldListVersionKey = this.cacheKeyFactory.getProductListVersionKey(oldProduct.categoryId);
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

  async invalidateFooterDetail() {
    await this.cacheService.bumpVersion(this.cacheKeyFactory.getFooterDetailListVersionKey());
  }
}
