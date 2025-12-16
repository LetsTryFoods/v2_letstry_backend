import { ObjectType, Field, Int } from '@nestjs/graphql';
import { Permission } from './permission.schema';
import { AdminRole, AdminRolePopulated } from './admin-role.schema';
import { AdminUser, AdminUserPopulated } from './admin-user.schema';
import { PaginationMeta } from '../common/pagination';

// ============ PERMISSION PAGINATION ============

@ObjectType()
export class PermissionPagination {
  @Field(() => [Permission])
  items: Permission[];

  @Field(() => PaginationMeta)
  meta: PaginationMeta;
}

// ============ ADMIN ROLE PAGINATION ============

@ObjectType()
export class AdminRolePagination {
  @Field(() => [AdminRolePopulated])
  items: AdminRolePopulated[];

  @Field(() => PaginationMeta)
  meta: PaginationMeta;
}

// ============ ADMIN USER PAGINATION ============

@ObjectType()
export class AdminUserPagination {
  @Field(() => [AdminUserPopulated])
  items: AdminUserPopulated[];

  @Field(() => PaginationMeta)
  meta: PaginationMeta;
}

// ============ AUTH RESPONSE ============

@ObjectType()
export class AdminAuthResponse {
  @Field()
  accessToken: string;

  @Field()
  _id: string;

  @Field()
  name: string;

  @Field()
  email: string;

  @Field()
  roleName: string;

  @Field()
  roleSlug: string;

  @Field(() => [AdminPermissionResponse])
  permissions: AdminPermissionResponse[];
}

@ObjectType()
export class AdminPermissionResponse {
  @Field()
  slug: string;

  @Field()
  name: string;

  @Field()
  module: string;

  @Field(() => [String])
  actions: string[];
}

// ============ ME RESPONSE (Current User) ============

@ObjectType()
export class AdminMeResponse {
  @Field()
  _id: string;

  @Field()
  name: string;

  @Field()
  email: string;

  @Field({ nullable: true })
  phone?: string;

  @Field({ nullable: true })
  avatar?: string;

  @Field()
  roleName: string;

  @Field()
  roleSlug: string;

  @Field(() => [AdminPermissionResponse])
  permissions: AdminPermissionResponse[];

  @Field()
  isActive: boolean;
}
