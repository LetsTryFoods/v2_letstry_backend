import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';
import { PERMISSION_KEY } from '../decorators/check-permission.decorator';

export interface PermissionRequirement {
  resource?: string;
  slug?: string; // Backward compatibility
  action: string;
}


@Injectable()
export class PermissionGuard implements CanActivate {
  private readonly logger = new Logger(PermissionGuard.name);

  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Get required permission from @RequirePermission decorator
    const requirement = this.reflector.getAllAndOverride<PermissionRequirement>(
      PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );

    // If no permission requirement, allow access
    if (!requirement) {
      return true;
    }

    // Get GraphQL context
    const ctx = GqlExecutionContext.create(context);
    const { user } = ctx.getContext().req;

    // If no user, deny access
    if (!user) {
      this.logger.warn('Permission check failed: User not authenticated');
      throw new ForbiddenException('Authentication required');
    }

    // Super admin bypass - allow all actions
    if (user.roleSlug === 'super-admin') {
      this.logger.debug(
        `Permission granted: Super admin ${user.email} has full access`,
      );
      return true;
    }

    // Get user's permissions from JWT token (no DB query!)
    const userPermissions = user.permissions || [];

    // Get resource name (support both new and old property names)
    const resourceName = requirement.resource || requirement.slug || '';
    
    if (!resourceName) {
      this.logger.error('Permission check failed: No resource specified in requirement');
      throw new ForbiddenException('Invalid permission requirement');
    }

    // Check permission using AWS-style evaluation
    const hasPermission = this.evaluatePermission(
      userPermissions,
      resourceName,
      requirement.action,
    );

    if (!hasPermission) {
      this.logger.warn(
        `Permission denied: User ${user.email} tried to ${requirement.action} on ${resourceName}`,
      );
      throw new ForbiddenException(
        `Access denied. You don't have permission to ${requirement.action} ${resourceName}`,
      );
    }

    this.logger.debug(
      `Permission granted: User ${user.email} can ${requirement.action} on ${resourceName}`,
    );

    return true;
  }

  /**
   * Evaluate permission similar to AWS IAM policy evaluation
   * @param userPermissions - User's permissions from JWT token
   * @param resource - Resource name (e.g., 'products', 'orders')
   * @param action - Action name (e.g., 'create', 'update', 'delete', 'view')
   * @returns boolean - Whether user has permission
   */
  private evaluatePermission(
    userPermissions: any[],
    resource: string,
    action: string,
  ): boolean {
    // Find the permission for this resource
    const permission = userPermissions.find((p) => p.slug === resource);

    if (!permission) {
      return false; // User doesn't have this resource at all
    }

    // Check if actions array exists
    if (!permission.actions || !Array.isArray(permission.actions)) {
      return false;
    }

    // Special case: "manage" action grants all permissions (like AWS "*")
    if (permission.actions.includes('manage')) {
      return true;
    }

    // Check if user has the specific action
    return permission.actions.includes(action);
  }
}
