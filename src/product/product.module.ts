import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProductService } from './product.service';
import { ProductSeoService } from './product-seo.service';
import { ProductResolver } from './product.resolver';
import { Product, ProductSchema } from './product.schema';
import { ProductSeo, ProductSeoSchema } from './product-seo.schema';
import { LoggerModule } from '../logger/logger.module';
import { CategoryModule } from '../category/category.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Product.name, schema: ProductSchema },
      { name: ProductSeo.name, schema: ProductSeoSchema },
    ]),
    LoggerModule,
    forwardRef(() => CategoryModule),
  ],
  providers: [ProductService, ProductSeoService, ProductResolver],
  exports: [ProductService, ProductSeoService],
})
export class ProductModule {}
