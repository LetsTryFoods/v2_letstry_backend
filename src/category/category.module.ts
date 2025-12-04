import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CategoryService } from './category.service';
import { CategoryResolver } from './category.resolver';
import { Category, CategorySchema } from './category.schema';
import { ProductModule } from '../product/product.module';

import { CategoryLoader } from './category.loader';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Category.name, schema: CategorySchema },
    ]),
    forwardRef(() => ProductModule),
  ],
  providers: [CategoryService, CategoryResolver, CategoryLoader],
  exports: [CategoryService, CategoryLoader],
})
export class CategoryModule {}
