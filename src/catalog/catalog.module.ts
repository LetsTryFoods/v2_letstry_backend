import { Module } from '@nestjs/common';
import { ProductModule } from '../product/product.module';
import { CategoryModule } from '../category/category.module';

@Module({
  imports: [ProductModule, CategoryModule],
  exports: [ProductModule, CategoryModule],
})
export class CatalogModule {}
