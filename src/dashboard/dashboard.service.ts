import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Product, ProductDocument } from '../product/product.schema';
import { Category, CategoryDocument } from '../category/category.schema';
import { Banner, BannerDocument } from '../banner/banner.schema';
import { Admin, AdminDocument } from '../admin/admin.schema';
import { Identity, IdentityDocument, IdentityStatus } from '../common/schemas/identity.schema';
import { DashboardStats } from './dashboard.schema';

@Injectable()
export class DashboardService {
  constructor(
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
    @InjectModel(Category.name) private categoryModel: Model<CategoryDocument>,
    @InjectModel(Banner.name) private bannerModel: Model<BannerDocument>,
    @InjectModel(Admin.name) private adminModel: Model<AdminDocument>,
    @InjectModel(Identity.name) private identityModel: Model<IdentityDocument>,
  ) {}

  async getStats(): Promise<DashboardStats> {
    const totalProducts = await this.productModel
      .countDocuments({ isArchived: false })
      .exec();
    const archivedProducts = await this.productModel
      .countDocuments({ isArchived: true })
      .exec();
    const inStockProducts = await this.productModel
      .countDocuments({
        isArchived: false,
        availabilityStatus: 'in_stock',
      })
      .exec();
    const outOfStockProducts = await this.productModel
      .countDocuments({
        isArchived: false,
        availabilityStatus: 'out_of_stock',
      })
      .exec();
    const totalCategories = await this.categoryModel
      .countDocuments({ isArchived: false })
      .exec();
    const activeBanners = await this.bannerModel
      .countDocuments({ isActive: true })
      .exec();
    const totalAdmins = await this.adminModel.countDocuments().exec();
    const totalUsers = await this.identityModel
      .countDocuments({ 
        status: { $in: [IdentityStatus.REGISTERED, IdentityStatus.VERIFIED, IdentityStatus.ACTIVE] }
      })
      .exec();

    return {
      totalProducts,
      archivedProducts,
      inStockProducts,
      outOfStockProducts,
      totalCategories,
      activeBanners,
      totalAdmins,
      totalUsers,
    };
  }
}
