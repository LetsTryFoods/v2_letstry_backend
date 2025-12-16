import { Injectable, OnModuleInit, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AdminRole, AdminRoleDocument, AdminRolePopulated } from './admin-role.schema';
import { Permission, PermissionDocument, PermissionAction } from './permission.schema';
import { CreateAdminRoleInput, UpdateAdminRoleInput } from './rbac.input';
import { PaginationMeta } from '../common/pagination';

@Injectable()
export class AdminRoleService implements OnModuleInit {
  private readonly logger = new Logger(AdminRoleService.name);

  constructor(
    @InjectModel(AdminRole.name) private roleModel: Model<AdminRoleDocument>,
    @InjectModel(Permission.name) private permissionModel: Model<PermissionDocument>,
  ) {}

  async onModuleInit() {
    await this.seedSuperAdminRole();
  }

  private async seedSuperAdminRole() {
    try {
      const existingSuperAdmin = await this.roleModel.findOne({ slug: 'super-admin' });
      if (!existingSuperAdmin) {
        // Get all permissions
        const allPermissions = await this.permissionModel.find({ isActive: true });
        
        // Create super admin with all permissions and all actions
        const permissions = allPermissions.map((p) => ({
          permission: p._id,
          actions: [PermissionAction.MANAGE], // Full access
        }));

        await this.roleModel.create({
          name: 'Super Admin',
          slug: 'super-admin',
          description: 'Full access to all features',
          permissions,
          isSystem: true,
          isActive: true,
        });
        
        this.logger.log('Seeded Super Admin role with all permissions');
      }
    } catch (error) {
      this.logger.error('Error seeding super admin role:', error);
    }
  }

  async findAll(page: number = 1, limit: number = 10): Promise<{ items: AdminRolePopulated[]; meta: PaginationMeta }> {
    const skip = (page - 1) * limit;
    const totalCount = await this.roleModel.countDocuments();
    
    const roles = await this.roleModel
      .find()
      .populate({
        path: 'permissions.permission',
        model: 'Permission',
      })
      .sort({ isSystem: -1, name: 1 })
      .skip(skip)
      .limit(limit)
      .exec();

    return {
      items: roles as unknown as AdminRolePopulated[],
      meta: {
        totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
        hasNextPage: page * limit < totalCount,
        hasPreviousPage: page > 1,
      },
    };
  }

  async findAllActive(): Promise<AdminRolePopulated[]> {
    const roles = await this.roleModel
      .find({ isActive: true })
      .populate({
        path: 'permissions.permission',
        model: 'Permission',
      })
      .sort({ name: 1 })
      .exec();

    return roles as unknown as AdminRolePopulated[];
  }

  async findById(id: string): Promise<AdminRolePopulated | null> {
    const role = await this.roleModel
      .findById(id)
      .populate({
        path: 'permissions.permission',
        model: 'Permission',
      })
      .exec();

    return role as unknown as AdminRolePopulated;
  }

  async findBySlug(slug: string): Promise<AdminRolePopulated | null> {
    const role = await this.roleModel
      .findOne({ slug })
      .populate({
        path: 'permissions.permission',
        model: 'Permission',
      })
      .exec();

    return role as unknown as AdminRolePopulated;
  }

  async create(input: CreateAdminRoleInput): Promise<AdminRolePopulated> {
    // Check if slug already exists
    const existing = await this.roleModel.findOne({ slug: input.slug });
    if (existing) {
      throw new BadRequestException('Role with this slug already exists');
    }

    // Validate permissions
    if (input.permissions && input.permissions.length > 0) {
      for (const perm of input.permissions) {
        const exists = await this.permissionModel.findById(perm.permission);
        if (!exists) {
          throw new BadRequestException(`Permission ${perm.permission} not found`);
        }
      }
    }

    const role = await this.roleModel.create({
      ...input,
      permissions: input.permissions?.map((p) => ({
        permission: new Types.ObjectId(p.permission),
        actions: p.actions,
      })) || [],
    });

    // Return populated role
    const populatedRole = await this.roleModel
      .findById(role._id)
      .populate({
        path: 'permissions.permission',
        model: 'Permission',
      })
      .exec();

    return populatedRole as unknown as AdminRolePopulated;
  }

  async update(id: string, input: UpdateAdminRoleInput): Promise<AdminRolePopulated | null> {
    const role = await this.roleModel.findById(id);
    if (!role) {
      throw new NotFoundException('Role not found');
    }

    // Prevent modifying system roles' slug
    if (role.isSystem && input.slug && input.slug !== role.slug) {
      throw new BadRequestException('Cannot modify system role slug');
    }

    // Check slug uniqueness if changed
    if (input.slug && input.slug !== role.slug) {
      const existing = await this.roleModel.findOne({ slug: input.slug });
      if (existing) {
        throw new BadRequestException('Role with this slug already exists');
      }
    }

    // Prepare update data
    const updateData: any = { ...input };
    if (input.permissions) {
      updateData.permissions = input.permissions.map((p) => ({
        permission: new Types.ObjectId(p.permission),
        actions: p.actions,
      }));
    }

    await this.roleModel.findByIdAndUpdate(id, { $set: updateData });

    // Return populated role
    const updatedRole = await this.roleModel
      .findById(id)
      .populate({
        path: 'permissions.permission',
        model: 'Permission',
      })
      .exec();

    return updatedRole as unknown as AdminRolePopulated;
  }

  async delete(id: string): Promise<boolean> {
    const role = await this.roleModel.findById(id);
    if (!role) {
      throw new NotFoundException('Role not found');
    }

    if (role.isSystem) {
      throw new BadRequestException('Cannot delete system roles');
    }

    await this.roleModel.findByIdAndDelete(id);
    return true;
  }

  async toggleActive(id: string): Promise<AdminRolePopulated | null> {
    const role = await this.roleModel.findById(id);
    if (!role) return null;

    if (role.isSystem) {
      throw new BadRequestException('Cannot deactivate system roles');
    }

    role.isActive = !role.isActive;
    await role.save();

    // Return populated role
    const updatedRole = await this.roleModel
      .findById(id)
      .populate({
        path: 'permissions.permission',
        model: 'Permission',
      })
      .exec();

    return updatedRole as unknown as AdminRolePopulated;
  }

  // Check if a role has a specific permission with action
  async hasPermission(roleId: string, permissionSlug: string, action: string): Promise<boolean> {
    const role = await this.roleModel
      .findById(roleId)
      .populate({
        path: 'permissions.permission',
        model: 'Permission',
      })
      .exec();

    if (!role || !role.isActive) return false;

    const rolePermission = (role.permissions as any[]).find(
      (p) => p.permission?.slug === permissionSlug,
    );

    if (!rolePermission) return false;

    // MANAGE action gives full access
    if (rolePermission.actions.includes(PermissionAction.MANAGE)) return true;

    return rolePermission.actions.includes(action);
  }
}
