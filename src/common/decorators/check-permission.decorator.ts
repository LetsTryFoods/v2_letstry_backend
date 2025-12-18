import { SetMetadata } from '@nestjs/common';

export const PERMISSION_KEY = 'permission_requirement';

export interface PermissionRequirement {
  resource: string;
  action: string;
}

/**
 * Decorator to check if user has the required permission action (AWS-style)
 * Similar to AWS IAM policy statements
 * 
 * @param resource - Permission resource (e.g., 'products', 'categories', 'orders')
 * @param action - Required action ('view', 'create', 'update', 'delete', 'manage')
 * 
 * @example
 * @RequirePermission('products', 'create')
 * async createProduct() { ... }
 * 
 * @example
 * @RequirePermission('orders', 'update')
 * async updateOrder() { ... }
 */
export const RequirePermission = (resource: string, action: string) =>
  SetMetadata(PERMISSION_KEY, { resource, action } as PermissionRequirement);

// Backward compatibility alias
export const CheckPermission = RequirePermission;
