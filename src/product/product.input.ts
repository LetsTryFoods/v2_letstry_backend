import { InputType, Field, Float, Int } from '@nestjs/graphql';

@InputType()
export class ProductImageInput {
  @Field()
  url: string;

  @Field()
  alt: string;
}

@InputType()
export class CreateProductInput {
  @Field()
  name: string;

  @Field({ nullable: true })
  slug?: string;

  @Field()
  description: string;

  @Field()
  categoryId: string;

  @Field()
  brand: string;

  @Field()
  sku: string;

  @Field({ nullable: true })
  gtin?: string;

  @Field({ nullable: true })
  mpn?: string;

  @Field(() => [ProductImageInput])
  images: ProductImageInput[];

  @Field()
  thumbnailUrl: string;

  @Field(() => Float)
  price: number;

  @Field(() => Float)
  mrp: number;

  @Field(() => Float)
  discountPercent: number;

  @Field({ nullable: true, defaultValue: 'INR' })
  currency?: string;

  @Field(() => Float)
  length: number;

  @Field(() => Float)
  height: number;

  @Field(() => Float)
  breadth: number;

  @Field(() => Float)
  weight: number;

  @Field({ nullable: true, defaultValue: 'g' })
  weightUnit?: string;

  @Field()
  packageSize: string;

  @Field()
  ingredients: string;

  @Field({ nullable: true })
  allergens?: string;

  @Field()
  shelfLife: string;

  @Field({ nullable: true, defaultValue: true })
  isVegetarian?: boolean;

  @Field({ nullable: true, defaultValue: false })
  isGlutenFree?: boolean;

  @Field({ nullable: true, defaultValue: 'in_stock' })
  availabilityStatus?: string;

  @Field(() => Int, { nullable: true, defaultValue: 0 })
  stockQuantity?: number;

  @Field(() => Float, { nullable: true })
  rating?: number;

  @Field(() => Int, { nullable: true, defaultValue: 0 })
  ratingCount?: number;

  @Field(() => [String], { nullable: true })
  keywords?: string[];

  @Field(() => [String], { nullable: true })
  tags?: string[];

  @Field({ nullable: true, defaultValue: 'product' })
  discountSource?: string;
}

@InputType()
export class UpdateProductInput {
  @Field({ nullable: true })
  name?: string;

  @Field({ nullable: true })
  slug?: string;

  @Field({ nullable: true })
  description?: string;

  @Field({ nullable: true })
  categoryId?: string;

  @Field({ nullable: true })
  brand?: string;

  @Field({ nullable: true })
  sku?: string;

  @Field({ nullable: true })
  gtin?: string;

  @Field({ nullable: true })
  mpn?: string;

  @Field(() => [ProductImageInput], { nullable: true })
  images?: ProductImageInput[];

  @Field({ nullable: true })
  thumbnailUrl?: string;

  @Field(() => Float, { nullable: true })
  price?: number;

  @Field(() => Float, { nullable: true })
  mrp?: number;

  @Field(() => Float, { nullable: true })
  discountPercent?: number;

  @Field({ nullable: true })
  currency?: string;

  @Field(() => Float, { nullable: true })
  length?: number;

  @Field(() => Float, { nullable: true })
  height?: number;

  @Field(() => Float, { nullable: true })
  breadth?: number;

  @Field(() => Float, { nullable: true })
  weight?: number;

  @Field({ nullable: true })
  weightUnit?: string;

  @Field({ nullable: true })
  packageSize?: string;

  @Field({ nullable: true })
  ingredients?: string;

  @Field({ nullable: true })
  allergens?: string;

  @Field({ nullable: true })
  shelfLife?: string;

  @Field({ nullable: true })
  isVegetarian?: boolean;

  @Field({ nullable: true })
  isGlutenFree?: boolean;

  @Field({ nullable: true })
  availabilityStatus?: string;

  @Field(() => Int, { nullable: true })
  stockQuantity?: number;

  @Field(() => Float, { nullable: true })
  rating?: number;

  @Field(() => Int, { nullable: true })
  ratingCount?: number;

  @Field(() => [String], { nullable: true })
  keywords?: string[];

  @Field(() => [String], { nullable: true })
  tags?: string[];

  @Field({ nullable: true })
  discountSource?: string;
}
