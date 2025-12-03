import { ObjectType, Field } from '@nestjs/graphql';
import { Product as ProductSchema, ProductImage } from './product.schema';

@ObjectType()
export class Product extends ProductSchema {
  @Field(() => require('../category/category.graphql').Category, {
    nullable: true,
  })
  category?: any;
}

export { ProductImage };
