import { Resolver, Query, Mutation, Args, Context, Int } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Public } from '../common/decorators/public.decorator';
import { PermissionService } from './permission.service';
import { AdminRoleService } from './admin-role.service';
import { AdminUserService } from './admin-user.service';
import { Permission } from './permission.schema';
import { AdminRolePopulated } from './admin-role.schema';
import { AdminUserPopulated } from './admin-user.schema';
import {
  CreatePermissionInput,
  UpdatePermissionInput,
  CreateAdminRoleInput,
  UpdateAdminRoleInput,
  CreateAdminUserInput,
  UpdateAdminUserInput,
  AdminLoginInput,
  ChangePasswordInput,
} from './rbac.input';
import {
  PermissionPagination,
  AdminRolePagination,
  AdminUserPagination,
  AdminAuthResponse,
  AdminMeResponse,
} from './rbac.pagination';

@Resolver()
export class RbacResolver {
  constructor(
    private permissionService: PermissionService,
    private adminRoleService: AdminRoleService,
    private adminUserService: AdminUserService,
  ) {}

  // ============ PERMISSION QUERIES & MUTATIONS ============

  @Query(() => [Permission], { name: 'permissions' })
  @UseGuards(JwtAuthGuard)
  async getPermissions(): Promise<Permission[]> {
    return this.permissionService.findAll();
  }

  @Query(() => [Permission], { name: 'activePermissions' })
  @UseGuards(JwtAuthGuard)
  async getActivePermissions(): Promise<Permission[]> {
    return this.permissionService.findActive();
  }

  @Query(() => Permission, { name: 'permission', nullable: true })
  @UseGuards(JwtAuthGuard)
  async getPermission(@Args('id') id: string): Promise<Permission | null> {
    return this.permissionService.findById(id);
  }

  @Query(() => [String], { name: 'permissionModules' })
  @UseGuards(JwtAuthGuard)
  async getPermissionModules(): Promise<string[]> {
    return this.permissionService.getModules();
  }

  @Mutation(() => Permission)
  @UseGuards(JwtAuthGuard)
  async createPermission(
    @Args('input') input: CreatePermissionInput,
  ): Promise<Permission> {
    return this.permissionService.create(input);
  }

  @Mutation(() => Permission, { nullable: true })
  @UseGuards(JwtAuthGuard)
  async updatePermission(
    @Args('id') id: string,
    @Args('input') input: UpdatePermissionInput,
  ): Promise<Permission | null> {
    return this.permissionService.update(id, input);
  }

  @Mutation(() => Boolean)
  @UseGuards(JwtAuthGuard)
  async deletePermission(@Args('id') id: string): Promise<boolean> {
    return this.permissionService.delete(id);
  }

  @Mutation(() => Permission, { nullable: true })
  @UseGuards(JwtAuthGuard)
  async togglePermissionActive(@Args('id') id: string): Promise<Permission | null> {
    return this.permissionService.toggleActive(id);
  }

  @Mutation(() => Boolean, { description: 'Reorder permissions for sidebar display' })
  @UseGuards(JwtAuthGuard)
  async reorderPermissions(
    @Args('orderedIds', { type: () => [String] }) orderedIds: string[],
  ): Promise<boolean> {
    return this.permissionService.reorderPermissions(orderedIds);
  }

  @Query(() => [Permission], { name: 'sortedPermissions', description: 'Get all active permissions sorted by sortOrder' })
  @UseGuards(JwtAuthGuard)
  async getSortedPermissions(): Promise<Permission[]> {
    return this.permissionService.findAllSorted();
  }

  // ============ ADMIN ROLE QUERIES & MUTATIONS ============

  @Query(() => AdminRolePagination, { name: 'adminRoles' })
  @UseGuards(JwtAuthGuard)
  async getAdminRoles(
    @Args('page', { type: () => Int, defaultValue: 1 }) page: number,
    @Args('limit', { type: () => Int, defaultValue: 10 }) limit: number,
  ): Promise<AdminRolePagination> {
    return this.adminRoleService.findAll(page, limit);
  }

  @Query(() => [AdminRolePopulated], { name: 'activeAdminRoles' })
  @UseGuards(JwtAuthGuard)
  async getActiveAdminRoles(): Promise<AdminRolePopulated[]> {
    return this.adminRoleService.findAllActive();
  }

  @Query(() => AdminRolePopulated, { name: 'adminRole', nullable: true })
  @UseGuards(JwtAuthGuard)
  async getAdminRole(@Args('id') id: string): Promise<AdminRolePopulated | null> {
    return this.adminRoleService.findById(id);
  }

  @Mutation(() => AdminRolePopulated)
  @UseGuards(JwtAuthGuard)
  async createAdminRole(
    @Args('input') input: CreateAdminRoleInput,
  ): Promise<AdminRolePopulated> {
    return this.adminRoleService.create(input);
  }

  @Mutation(() => AdminRolePopulated, { nullable: true })
  @UseGuards(JwtAuthGuard)
  async updateAdminRole(
    @Args('id') id: string,
    @Args('input') input: UpdateAdminRoleInput,
  ): Promise<AdminRolePopulated | null> {
    return this.adminRoleService.update(id, input);
  }

  @Mutation(() => Boolean)
  @UseGuards(JwtAuthGuard)
  async deleteAdminRole(@Args('id') id: string): Promise<boolean> {
    return this.adminRoleService.delete(id);
  }

  @Mutation(() => AdminRolePopulated, { nullable: true })
  @UseGuards(JwtAuthGuard)
  async toggleAdminRoleActive(@Args('id') id: string): Promise<AdminRolePopulated | null> {
    return this.adminRoleService.toggleActive(id);
  }

  // ============ ADMIN USER QUERIES & MUTATIONS ============

  @Query(() => AdminUserPagination, { name: 'adminUsers' })
  @UseGuards(JwtAuthGuard)
  async getAdminUsers(
    @Args('page', { type: () => Int, defaultValue: 1 }) page: number,
    @Args('limit', { type: () => Int, defaultValue: 10 }) limit: number,
  ): Promise<AdminUserPagination> {
    return this.adminUserService.findAll(page, limit);
  }

  @Query(() => AdminUserPopulated, { name: 'adminUser', nullable: true })
  @UseGuards(JwtAuthGuard)
  async getAdminUser(@Args('id') id: string): Promise<AdminUserPopulated | null> {
    return this.adminUserService.findById(id);
  }

  @Mutation(() => AdminUserPopulated)
  @UseGuards(JwtAuthGuard)
  async createAdminUser(
    @Args('input') input: CreateAdminUserInput,
  ): Promise<AdminUserPopulated> {
    return this.adminUserService.create(input);
  }

  @Mutation(() => AdminUserPopulated, { nullable: true })
  @UseGuards(JwtAuthGuard)
  async updateAdminUser(
    @Args('id') id: string,
    @Args('input') input: UpdateAdminUserInput,
  ): Promise<AdminUserPopulated | null> {
    return this.adminUserService.update(id, input);
  }

  @Mutation(() => Boolean)
  @UseGuards(JwtAuthGuard)
  async deleteAdminUser(@Args('id') id: string): Promise<boolean> {
    return this.adminUserService.delete(id);
  }

  @Mutation(() => AdminUserPopulated, { nullable: true })
  @UseGuards(JwtAuthGuard)
  async toggleAdminUserActive(@Args('id') id: string): Promise<AdminUserPopulated | null> {
    return this.adminUserService.toggleActive(id);
  }

  // ============ AUTH MUTATIONS ============

  @Mutation(() => AdminAuthResponse)
  @Public()
  async adminUserLogin(
    @Args('input') input: AdminLoginInput,
    @Context() context: any,
  ): Promise<AdminAuthResponse> {
    const result = await this.adminUserService.login(input);
    
    // Set cookie
    if (context.res) {
      context.res.cookie('access_token', result.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 60 * 60 * 1000, // 1 hour
      });
    }

    return result;
  }

  @Query(() => AdminMeResponse, { name: 'adminMe', nullable: true })
  @UseGuards(JwtAuthGuard)
  async getAdminMe(@Context() context: any): Promise<AdminMeResponse | null> {
    const user = context.req.user;
    if (!user || !user._id) return null;
    return this.adminUserService.getMe(user._id.toString());
  }

  @Mutation(() => Boolean)
  @UseGuards(JwtAuthGuard)
  async changeAdminPassword(
    @Args('input') input: ChangePasswordInput,
    @Context() context: any,
  ): Promise<boolean> {
    const user = context.req.user;
    if (!user || !user._id) return false;
    return this.adminUserService.changePassword(user._id.toString(), input);
  }

  @Mutation(() => Boolean)
  @UseGuards(JwtAuthGuard)
  async adminLogout(@Context() context: any): Promise<boolean> {
    if (context.res) {
      context.res.clearCookie('access_token');
    }
    return true;
  }
}
