import { Injectable } from '@nestjs/common';

@Injectable()
export class CacheKeyFactory {
  // --- Product Keys ---

  getProductListVersionKey(categorySlug: string): string {
    return `product:list:category:${categorySlug}:version`;
  }

  getProductListKey(
    categorySlug: string,
    sort: string,
    page: number,
    version: number,
  ): string {
    return `product:list:category:${categorySlug}:v${version}:sort:${sort}:page:${page}`;
  }

  getProductDetailVersionKey(productId: string): string {
    return `product:detail:${productId}:version`;
  }

  getProductDetailKey(productId: string, version: number): string {
    return `product:detail:${productId}:v${version}`;
  }

  // --- Category Keys ---

  getCategoryListVersionKey(): string {
    return `category:list:version`;
  }

  getCategoryListKey(version: number): string {
    return `category:list:v${version}`;
  }

  getCategoryDetailVersionKey(slug: string): string {
    return `category:detail:${slug}:version`;
  }

  getCategoryDetailKey(slug: string, version: number): string {
    return `category:detail:${slug}:v${version}`;
  }

  // --- Banner Keys ---

  getBannerListVersionKey(): string {
    return `banner:list:version`;
  }

  getBannerListKey(version: number, type: string = 'all'): string {
    return `banner:list:v${version}:type:${type}`;
  }

  // --- Policy Keys ---

  getPolicyListVersionKey(): string {
    return `policy:list:version`;
  }

  getPolicyListKey(version: number): string {
    return `policy:list:v${version}`;
  }

  getPolicyDetailVersionKey(slug: string): string {
    return `policy:detail:${slug}:version`;
  }

  getPolicyDetailKey(slug: string, version: number): string {
    return `policy:detail:${slug}:v${version}`;
  }
}
