import { Injectable, OnModuleInit, Logger, BadRequestException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AdminUser, AdminUserDocument, AdminUserPopulated, AdminPermissionDetail } from './admin-user.schema';
import { AdminRole, AdminRoleDocument } from './admin-role.schema';
import { Permission, PermissionDocument, PermissionAction } from './permission.schema';
import { CreateAdminUserInput, UpdateAdminUserInput, AdminLoginInput, ChangePasswordInput } from './rbac.input';
import { PaginationMeta } from '../common/pagination';
import { AdminAuthResponse, AdminMeResponse, AdminPermissionResponse } from './rbac.pagination';

@Injectable()
export class AdminUserService implements OnModuleInit {
  private readonly logger = new Logger(AdminUserService.name);

  constructor(
    @InjectModel(AdminUser.name) private userModel: Model<AdminUserDocument>,
    @InjectModel(AdminRole.name) private roleModel: Model<AdminRoleDocument>,
    @InjectModel(Permission.name) private permissionModel: Model<PermissionDocument>,
    private jwtService: JwtService,
  ) {}

  async onModuleInit() {
    await this.seedSuperAdminUser();
  }

  private async seedSuperAdminUser() {
    try {
      const existingAdmin = await this.userModel.findOne({ email: 'admin@letstry.com' });
      if (!existingAdmin) {
        // Get super admin role
        const superAdminRole = await this.roleModel.findOne({ slug: 'super-admin' });
        if (!superAdminRole) {
          this.logger.warn('Super Admin role not found, skipping user seed');
          return;
        }

        const hashedPassword = await bcrypt.hash('Admin@123', 10);
        await this.userModel.create({
          name: 'Super Admin',
          email: 'admin@letstry.com',
          password: hashedPassword,
          role: superAdminRole._id,
          isActive: true,
        });

        this.logger.log('Seeded Super Admin user (admin@letstry.com / Admin@123)');
      }
    } catch (error) {
      this.logger.error('Error seeding super admin user:', error);
    }
  }

  async findAll(page: number = 1, limit: number = 10): Promise<{ items: AdminUserPopulated[]; meta: PaginationMeta }> {
    const skip = (page - 1) * limit;
    const totalCount = await this.userModel.countDocuments();

    const users = await this.userModel
      .find()
      .select('-password')
      .populate({
        path: 'role',
        populate: {
          path: 'permissions.permission',
          model: 'Permission',
        },
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec();

    return {
      items: users as unknown as AdminUserPopulated[],
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

  async findById(id: string): Promise<AdminUserPopulated | null> {
    const user = await this.userModel
      .findById(id)
      .select('-password')
      .populate({
        path: 'role',
        populate: {
          path: 'permissions.permission',
          model: 'Permission',
        },
      })
      .exec();

    return user as unknown as AdminUserPopulated;
  }

  async findByEmail(email: string): Promise<AdminUserDocument | null> {
    return this.userModel.findOne({ email }).exec();
  }

  async create(input: CreateAdminUserInput): Promise<AdminUserPopulated> {
    // Check if email exists
    const existing = await this.userModel.findOne({ email: input.email });
    if (existing) {
      throw new BadRequestException('User with this email already exists');
    }

    // Validate role
    const role = await this.roleModel.findById(input.role);
    if (!role) {
      throw new BadRequestException('Invalid role');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(input.password, 10);

    const user = await this.userModel.create({
      ...input,
      password: hashedPassword,
      role: new Types.ObjectId(input.role),
    });

    // Return populated user
    const populatedUser = await this.userModel
      .findById(user._id)
      .select('-password')
      .populate({
        path: 'role',
        populate: {
          path: 'permissions.permission',
          model: 'Permission',
        },
      })
      .exec();

    return populatedUser as unknown as AdminUserPopulated;
  }

  async update(id: string, input: UpdateAdminUserInput): Promise<AdminUserPopulated | null> {
    const user = await this.userModel.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check email uniqueness if changed
    if (input.email && input.email !== user.email) {
      const existing = await this.userModel.findOne({ email: input.email });
      if (existing) {
        throw new BadRequestException('User with this email already exists');
      }
    }

    // Prepare update data
    const updateData: any = { ...input };

    // Hash password if provided
    if (input.password) {
      updateData.password = await bcrypt.hash(input.password, 10);
    }

    // Convert role to ObjectId if provided
    if (input.role) {
      const role = await this.roleModel.findById(input.role);
      if (!role) {
        throw new BadRequestException('Invalid role');
      }
      updateData.role = new Types.ObjectId(input.role);
    }

    await this.userModel.findByIdAndUpdate(id, { $set: updateData });

    // Return populated user
    const updatedUser = await this.userModel
      .findById(id)
      .select('-password')
      .populate({
        path: 'role',
        populate: {
          path: 'permissions.permission',
          model: 'Permission',
        },
      })
      .exec();

    return updatedUser as unknown as AdminUserPopulated;
  }

  async delete(id: string): Promise<boolean> {
    const user = await this.userModel.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Prevent deleting the last super admin
    const superAdminRole = await this.roleModel.findOne({ slug: 'super-admin' });
    if (superAdminRole && user.role.toString() === superAdminRole._id.toString()) {
      const superAdminCount = await this.userModel.countDocuments({ role: superAdminRole._id });
      if (superAdminCount <= 1) {
        throw new BadRequestException('Cannot delete the last Super Admin');
      }
    }

    await this.userModel.findByIdAndDelete(id);
    return true;
  }

  async toggleActive(id: string): Promise<AdminUserPopulated | null> {
    const user = await this.userModel.findById(id);
    if (!user) return null;

    // Prevent deactivating the last super admin
    const superAdminRole = await this.roleModel.findOne({ slug: 'super-admin' });
    if (superAdminRole && user.role.toString() === superAdminRole._id.toString() && user.isActive) {
      const activeSuperAdminCount = await this.userModel.countDocuments({
        role: superAdminRole._id,
        isActive: true,
      });
      if (activeSuperAdminCount <= 1) {
        throw new BadRequestException('Cannot deactivate the last active Super Admin');
      }
    }

    user.isActive = !user.isActive;
    await user.save();

    // Return populated user
    const updatedUser = await this.userModel
      .findById(id)
      .select('-password')
      .populate({
        path: 'role',
        populate: {
          path: 'permissions.permission',
          model: 'Permission',
        },
      })
      .exec();

    return updatedUser as unknown as AdminUserPopulated;
  }

  // ============ AUTH METHODS ============

  /**
   * AWS-Style Login with JWT Permissions
   * Embeds permissions directly in JWT token for fast access without DB queries
   */
  async login(input: AdminLoginInput): Promise<AdminAuthResponse> {
    const user = await this.userModel
      .findOne({ email: input.email })
      .populate({
        path: 'role',
        populate: {
          path: 'permissions.permission',
          model: 'Permission',
        },
      })
      .exec();

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Your account has been deactivated');
    }

    const isPasswordValid = await bcrypt.compare(input.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const role = user.role as any;
    if (!role || !role.isActive) {
      throw new UnauthorizedException('Your role has been deactivated');
    }

    // Update last login
    await this.userModel.findByIdAndUpdate(user._id, { lastLoginAt: new Date() });

    // Build permissions array for frontend (sorted by sortOrder)
    const permissions: AdminPermissionResponse[] = (role.permissions || [])
      .filter((p: any) => p.permission && p.permission.isActive)
      .map((p: any) => ({
        slug: p.permission.slug,
        name: p.permission.name,
        module: p.permission.module,
        sortOrder: p.permission.sortOrder || 0,
        actions: p.actions,
      }))
      .sort((a: AdminPermissionResponse, b: AdminPermissionResponse) => a.sortOrder - b.sortOrder);

    // ✅ Generate JWT with embedded permissions (AWS-style)
    const payload = {
      sub: user._id,
      email: user.email,
      role: 'admin', // Keep for backward compatibility with existing guards
      roleId: role._id,
      roleSlug: role.slug,
      permissions, // ✅ Store permissions in JWT token for fast access
    };

    const accessToken = this.jwtService.sign(payload);

    this.logger.log(`User ${user.email} logged in successfully with ${permissions.length} permissions`);

    return {
      accessToken,
      _id: user._id.toString(),
      name: user.name,
      email: user.email,
      roleName: role.name,
      roleSlug: role.slug,
      permissions,
    };
  }

  /**
   * Validate JWT Payload
   * For backward compatibility - returns user with permissions from JWT if available
   */
  async validateJwtPayload(payload: any): Promise<any> {
    // ✅ If permissions are in JWT, use them directly (fast path)
    if (payload.permissions && Array.isArray(payload.permissions)) {
      return {
        _id: payload.sub,
        email: payload.email,
        role: payload.role,
        roleId: payload.roleId,
        roleSlug: payload.roleSlug,
        permissions: payload.permissions, // ✅ From JWT token
      };
    }

    // Fallback: Query database if no permissions in JWT (backward compatibility)
    const user = await this.userModel
      .findById(payload.sub)
      .select('-password')
      .populate({
        path: 'role',
        populate: {
          path: 'permissions.permission',
          model: 'Permission',
        },
      })
      .exec();

    if (!user || !user.isActive) {
      return null;
    }

    const role = user.role as any;
    if (!role || !role.isActive) {
      return null;
    }

    return {
      ...user.toObject(),
      role: 'admin', // For backward compatibility
      roleId: role._id,
      roleSlug: role.slug,
      permissions: (role.permissions || [])
        .filter((p: any) => p.permission && p.permission.isActive)
        .map((p: any) => ({
          slug: p.permission.slug,
          name: p.permission.name,
          module: p.permission.module,
          sortOrder: p.permission.sortOrder || 0,
          actions: p.actions,
        }))
        .sort((a: any, b: any) => a.sortOrder - b.sortOrder),
    };
  }

  async getMe(userId: string): Promise<AdminMeResponse | null> {
    const user = await this.userModel
      .findById(userId)
      .select('-password')
      .populate({
        path: 'role',
        populate: {
          path: 'permissions.permission',
          model: 'Permission',
        },
      })
      .exec();

    if (!user) return null;

    const role = user.role as any;
    const permissions: AdminPermissionResponse[] = (role?.permissions || [])
      .filter((p: any) => p.permission && p.permission.isActive)
      .map((p: any) => ({
        slug: p.permission.slug,
        name: p.permission.name,
        module: p.permission.module,
        sortOrder: p.permission.sortOrder || 0,
        actions: p.actions,
      }))
      .sort((a: AdminPermissionResponse, b: AdminPermissionResponse) => a.sortOrder - b.sortOrder);

    return {
      _id: user._id.toString(),
      name: user.name,
      email: user.email,
      phone: user.phone,
      avatar: user.avatar,
      roleName: role?.name || '',
      roleSlug: role?.slug || '',
      permissions,
      isActive: user.isActive,
    };
  }

  async changePassword(userId: string, input: ChangePasswordInput): Promise<boolean> {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(input.currentPassword, user.password);
    if (!isPasswordValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    // Hash and set new password
    user.password = await bcrypt.hash(input.newPassword, 10);
    await user.save();

    this.logger.log(`User ${user.email} changed password`);

    return true;
  }
}
