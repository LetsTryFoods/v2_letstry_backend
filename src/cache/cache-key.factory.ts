import { Injectable } from '@nestjs/common';

@Injectable()
export class CacheKeyFactory {


  getProductGlobalListVersionKey(): string {
    return `product:list:global:version`;
  }

  getProductGlobalListKey(
    page: number,
    limit: number,
    sort: string,
    version: number,
    includeOutOfStock: boolean,
    includeArchived: boolean,
  ): string {
    return `product:list:global:v${version}:page:${page}:limit:${limit}:sort:${sort}:oos:${includeOutOfStock}:archived:${includeArchived}`;
  }

  // Category Product List
  getProductListVersionKey(categoryId: string): string {
    return `product:list:category:${categoryId}:version`;
  }

  getProductListKey(
    categoryId: string,
    page: number,
    limit: number,
    sort: string,
    version: number,
    includeOutOfStock: boolean,
    includeArchived: boolean,
  ): string {
    return `product:list:category:${categoryId}:v${version}:page:${page}:limit:${limit}:sort:${sort}:oos:${includeOutOfStock}:archived:${includeArchived}`;
  }

  // Product Detail
  getProductDetailVersionKey(identifier: string): string {
    return `product:detail:${identifier}:version`;
  }

  getProductDetailKey(identifier: string, version: number): string {
    return `product:detail:${identifier}:v${version}`;
  }

  // --- Category Keys ---

  getCategoryListVersionKey(): string {
    return `category:list:version`;
  }

  getCategoryListKey(version: number): string {
    return `category:list:v${version}`;
  }

  getCategoryListPaginatedKey(page: number, limit: number, version: number): string {
    return `category:list:v${version}:page:${page}:limit:${limit}`;
  }

  getCategoryDetailVersionKey(identifier: string): string {
    return `category:detail:${identifier}:version`;
  }

  getCategoryDetailKey(identifier: string, version: number): string {
    return `category:detail:${identifier}:v${version}`;
  }

  getCategoryChildrenKey(parentId: string, version: number): string {
    return `category:list:v${version}:children:${parentId}`;
  }

  getCategoryChildrenPaginatedKey(parentId: string, page: number, limit: number, version: number): string {
    return `category:list:v${version}:children:${parentId}:page:${page}:limit:${limit}`;
  }

  getCategoryRootsKey(version: number): string {
    return `category:list:v${version}:roots`;
  }

  getCategoryRootsPaginatedKey(page: number, limit: number, version: number): string {
    return `category:list:v${version}:roots:page:${page}:limit:${limit}`;
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

  getPolicyListKey(version: number, type: string = 'all'): string {
    return `policy:list:v${version}:type:${type}`;
  }

  getPolicyDetailVersionKey(slug: string): string {
    return `policy:detail:${slug}:version`;
  }

  getPolicyDetailKey(slug: string, version: number): string {
    return `policy:detail:${slug}:v${version}`;
  }
}
