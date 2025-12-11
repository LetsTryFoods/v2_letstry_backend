import { ObjectType, Field, Float } from '@nestjs/graphql';
import { Product as ProductSchema, ProductImage, ProductVariant } from './product.schema';

@ObjectType()
export class Product extends ProductSchema {
  @Field(() => require('../category/category.graphql').Category, {
    nullable: true,
  })
  category?: any;
}

@ObjectType()
export class PriceRange {
  @Field(() => Float)
  min: number;

  @Field(() => Float)
  max: number;
}

export { ProductImage, ProductVariant };
