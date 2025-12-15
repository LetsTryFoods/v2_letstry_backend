import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DashboardService } from './dashboard.service';
import { DashboardResolver } from './dashboard.resolver';
import { Product, ProductSchema } from '../product/product.schema';
import { Category, CategorySchema } from '../category/category.schema';
import { Banner, BannerSchema } from '../banner/banner.schema';
import { Admin, AdminSchema } from '../admin/admin.schema';
import { Identity, IdentitySchema } from '../common/schemas/identity.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Product.name, schema: ProductSchema },
      { name: Category.name, schema: CategorySchema },
      { name: Banner.name, schema: BannerSchema },
      { name: Admin.name, schema: AdminSchema },
      { name: Identity.name, schema: IdentitySchema },
    ]),
  ],
  providers: [DashboardService, DashboardResolver],
  exports: [DashboardService],
})
export class DashboardModule {}
