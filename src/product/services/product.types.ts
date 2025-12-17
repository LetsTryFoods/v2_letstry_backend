export const PRODUCT_CACHE_TTL = 15552000000;
export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 10;

export interface ProductFilter {
  _id?: string | { $ne: string };
  slug?: string;
  categoryIds?: string | string[];
  isArchived?: boolean;
  availabilityStatus?: string | { $ne: string };
  'variants.sku'?: string;
  'variants._id'?: string;
  'variants.availabilityStatus'?: string | { $ne: string };
  variants?: { $elemMatch: Record<string, any> };
  $or?: Array<Record<string, RegExp>>;
  $and?: Array<Record<string, any>>;
}

export interface PaginationParams {
  skip: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface StockUpdateParams {
  stockQuantity: number;
  availabilityStatus: string;
}
