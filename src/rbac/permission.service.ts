import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Permission, PermissionDocument } from './permission.schema';
import { CreatePermissionInput, UpdatePermissionInput } from './rbac.input';

// Default permissions for admin panel pages
const DEFAULT_PERMISSIONS = [
  { slug: 'dashboard', name: 'Dashboard', module: 'core', sortOrder: 1 },
  { slug: 'products', name: 'Products', module: 'catalog', sortOrder: 10 },
  { slug: 'banners', name: 'Banners', module: 'content', sortOrder: 20 },
  { slug: 'categories', name: 'Categories', module: 'catalog', sortOrder: 11 },
  { slug: 'address', name: 'Address', module: 'settings', sortOrder: 30 },
  { slug: 'footer-detail', name: 'Footer Details', module: 'content', sortOrder: 21 },
  { slug: 'seo-content', name: 'SEO Content', module: 'seo', sortOrder: 40 },
  { slug: 'sco-product', name: 'Product SEO', module: 'seo', sortOrder: 41 },
  { slug: 'coupons', name: 'Coupons', module: 'marketing', sortOrder: 50 },
  { slug: 'charges', name: 'Charges', module: 'settings', sortOrder: 31 },
  { slug: 'customers', name: 'Customers', module: 'users', sortOrder: 60 },
  { slug: 'cards', name: 'Abandoned Carts', module: 'orders', sortOrder: 71 },
  { slug: 'orders', name: 'Orders', module: 'orders', sortOrder: 70 },
  { slug: 'reviews', name: 'Reviews', module: 'catalog', sortOrder: 12 },
  { slug: 'notifications', name: 'Notifications', module: 'marketing', sortOrder: 51 },
  { slug: 'reports', name: 'Reports', module: 'analytics', sortOrder: 80 },
  { slug: 'faq', name: 'FAQ', module: 'content', sortOrder: 22 },
  { slug: 'contact', name: 'Contact Queries', module: 'content', sortOrder: 23 },
  { slug: 'policies', name: 'Policies', module: 'content', sortOrder: 24 },
  { slug: 'rbac', name: 'User Management', module: 'admin', sortOrder: 90, description: 'Manage admin users, roles and permissions' },
];

@Injectable()
export class PermissionService implements OnModuleInit {
  private readonly logger = new Logger(PermissionService.name);

  constructor(
    @InjectModel(Permission.name) private permissionModel: Model<PermissionDocument>,
  ) {}

  async onModuleInit() {
    await this.seedDefaultPermissions();
  }

  private async seedDefaultPermissions() {
    try {
      const existingCount = await this.permissionModel.countDocuments();
      if (existingCount === 0) {
        await this.permissionModel.insertMany(
          DEFAULT_PERMISSIONS.map((p) => ({ ...p, isActive: true })),
        );
        this.logger.log(`Seeded ${DEFAULT_PERMISSIONS.length} default permissions`);
      }
    } catch (error) {
      this.logger.error('Error seeding default permissions:', error);
    }
  }

  async findAll(): Promise<Permission[]> {
    return this.permissionModel.find().sort({ module: 1, sortOrder: 1 }).exec();
  }

  async findActive(): Promise<Permission[]> {
    return this.permissionModel.find({ isActive: true }).sort({ module: 1, sortOrder: 1 }).exec();
  }

  async findById(id: string): Promise<Permission | null> {
    return this.permissionModel.findById(id).exec();
  }

  async findBySlug(slug: string): Promise<Permission | null> {
    return this.permissionModel.findOne({ slug }).exec();
  }

  async findByModule(module: string): Promise<Permission[]> {
    return this.permissionModel.find({ module, isActive: true }).sort({ sortOrder: 1 }).exec();
  }

  async create(input: CreatePermissionInput): Promise<Permission> {
    const permission = new this.permissionModel(input);
    return permission.save();
  }

  async update(id: string, input: UpdatePermissionInput): Promise<Permission | null> {
    return this.permissionModel
      .findByIdAndUpdate(id, { $set: input }, { new: true })
      .exec();
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.permissionModel.findByIdAndDelete(id).exec();
    return !!result;
  }

  async toggleActive(id: string): Promise<Permission | null> {
    const permission = await this.permissionModel.findById(id).exec();
    if (!permission) return null;

    permission.isActive = !permission.isActive;
    return permission.save();
  }

  // Get distinct modules for grouping
  async getModules(): Promise<string[]> {
    return this.permissionModel.distinct('module').exec();
  }

  // Reorder permissions - update sortOrder for multiple permissions
  async reorderPermissions(orderedIds: string[]): Promise<boolean> {
    try {
      const bulkOperations = orderedIds.map((id, index) => ({
        updateOne: {
          filter: { _id: id },
          update: { $set: { sortOrder: index + 1 } },
        },
      }));

      await this.permissionModel.bulkWrite(bulkOperations);
      this.logger.log(`Reordered ${orderedIds.length} permissions`);
      return true;
    } catch (error) {
      this.logger.error('Error reordering permissions:', error);
      return false;
    }
  }

  // Get all permissions sorted by sortOrder (for sidebar)
  async findAllSorted(): Promise<Permission[]> {
    return this.permissionModel.find({ isActive: true }).sort({ sortOrder: 1 }).exec();
  }
}
