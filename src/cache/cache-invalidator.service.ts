import { Injectable } from '@nestjs/common';
import { CacheService } from './cache.service';
import { CacheKeyFactory } from './cache-key.factory';
import { Product } from '../product/product.schema';
import { Category } from '../category/category.schema';

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
    // 1. Invalidate Product Detail
    const detailVersionKey = this.cacheKeyFactory.getProductDetailVersionKey(
      newProduct._id,
    );
    await this.cacheService.bumpVersion(detailVersionKey);

    // 2. Invalidate List for New Category
    if (newProduct.categoryId) {
      // We need the slug. Since we might only have ID, we rely on the service passing the slug 
      // OR we invalidate based on ID if we changed the key design. 
      // However, the requirement is categorySlug. 
      // Ideally, the caller should pass the slug or the full populated category object.
      // Assuming newProduct.category is populated or we fetch it. 
      // For now, we will assume the caller might need to handle this or we accept slugs as args.
      
      // If we only have ID, we can't generate the slug-based key without fetching.
      // To keep this pure, let's assume the product object has what we need 
      // OR we change the signature to accept slugs.
      
      // Let's try to use what's on the product. If category is not populated, this might be tricky.
      // BUT, usually in update flows we have the data.
      
      // If category is an object (populated)
      const newCategorySlug = (newProduct as any).category?.slug; 
      if (newCategorySlug) {
         const listVersionKey = this.cacheKeyFactory.getProductListVersionKey(newCategorySlug);
         await this.cacheService.bumpVersion(listVersionKey);
      }
    }

    // 3. Invalidate List for Old Category (if changed)
    if (oldProduct && oldProduct.categoryId !== newProduct.categoryId) {
       const oldCategorySlug = (oldProduct as any).category?.slug;
       if (oldCategorySlug) {
          const oldListVersionKey = this.cacheKeyFactory.getProductListVersionKey(oldCategorySlug);
          await this.cacheService.bumpVersion(oldListVersionKey);
       }
    }
  }

  /**
   * Helper to invalidate by slugs directly if objects aren't fully populated
   */
  async invalidateProductBySlug(productId: string, newCategorySlug: string, oldCategorySlug?: string) {
      // Detail
      await this.cacheService.bumpVersion(this.cacheKeyFactory.getProductDetailVersionKey(productId));
      
      // New Category List
      await this.cacheService.bumpVersion(this.cacheKeyFactory.getProductListVersionKey(newCategorySlug));

      // Old Category List
      if (oldCategorySlug && oldCategorySlug !== newCategorySlug) {
          await this.cacheService.bumpVersion(this.cacheKeyFactory.getProductListVersionKey(oldCategorySlug));
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

  async invalidatePolicy(slug: string) {
    await this.cacheService.bumpVersion(this.cacheKeyFactory.getPolicyListVersionKey());
    await this.cacheService.bumpVersion(this.cacheKeyFactory.getPolicyDetailVersionKey(slug));
  }
}
