import { InputType, Field, Float, Int } from '@nestjs/graphql';
import { ProductSeoInput } from './product-seo.input';

@InputType()
export class ProductImageInput {
  @Field()
  url: string;

  @Field()
  alt: string;
}

@InputType()
export class CreateProductVariantInput {
  @Field()
  sku: string;

  @Field()
  name: string;

  @Field(() => Float)
  price: number;

  @Field(() => Float)
  mrp: number;

  @Field(() => Float)
  discountPercent: number;

  @Field({ defaultValue: 'product' })
  discountSource: string;

  @Field(() => Float)
  weight: number;

  @Field({ defaultValue: 'g' })
  weightUnit: string;

  @Field()
  packageSize: string;

  @Field(() => Float)
  length: number;

  @Field(() => Float)
  height: number;

  @Field(() => Float)
  breadth: number;

  @Field(() => Int, { defaultValue: 0 })
  stockQuantity: number;

  @Field({ defaultValue: 'in_stock' })
  availabilityStatus: string;

  @Field(() => [ProductImageInput])
  images: ProductImageInput[];

  @Field()
  thumbnailUrl: string;

  @Field({ defaultValue: false })
  isDefault: boolean;

  @Field({ defaultValue: true })
  isActive: boolean;
}

@InputType()
export class UpdateProductVariantInput {
  @Field()
  _id: string;

  @Field({ nullable: true })
  sku?: string;

  @Field({ nullable: true })
  name?: string;

  @Field(() => Float, { nullable: true })
  price?: number;

  @Field(() => Float, { nullable: true })
  mrp?: number;

  @Field(() => Float, { nullable: true })
  discountPercent?: number;

  @Field({ nullable: true })
  discountSource?: string;

  @Field(() => Float, { nullable: true })
  weight?: number;

  @Field({ nullable: true })
  weightUnit?: string;

  @Field({ nullable: true })
  packageSize?: string;

  @Field(() => Float, { nullable: true })
  length?: number;

  @Field(() => Float, { nullable: true })
  height?: number;

  @Field(() => Float, { nullable: true })
  breadth?: number;

  @Field(() => Int, { nullable: true })
  stockQuantity?: number;

  @Field({ nullable: true })
  availabilityStatus?: string;

  @Field(() => [ProductImageInput], { nullable: true })
  images?: ProductImageInput[];

  @Field({ nullable: true })
  thumbnailUrl?: string;

  @Field({ nullable: true })
  isDefault?: boolean;

  @Field({ nullable: true })
  isActive?: boolean;
}

@InputType()
export class CreateProductInput {
  @Field()
  name: string;

  @Field({ nullable: true })
  slug?: string;

  @Field({ nullable: true })
  favourite?: boolean;

  @Field()
  description: string;

  @Field(() => [String])
  categoryIds: string[];

  @Field()
  brand: string;

  @Field({ nullable: true })
  gtin?: string;

  @Field({ nullable: true })
  mpn?: string;

  @Field({ nullable: true, defaultValue: 'INR' })
  currency?: string;

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

  @Field(() => Float, { nullable: true })
  rating?: number;

  @Field(() => Int, { nullable: true, defaultValue: 0 })
  ratingCount?: number;

  @Field(() => [String], { nullable: true })
  keywords?: string[];

  @Field(() => [String], { nullable: true })
  tags?: string[];

  @Field(() => [CreateProductVariantInput])
  variants: CreateProductVariantInput[];

  @Field(() => ProductSeoInput, { nullable: true })
  seo?: ProductSeoInput;
}

@InputType()
export class UpdateProductInput {
  @Field({ nullable: true })
  name?: string;

  @Field({ nullable: true })
  slug?: string;

  @Field({ nullable: true })
  description?: string;

  @Field(() => [String], { nullable: true })
  categoryIds?: string[];

  @Field({ nullable: true })
  favourite?: boolean;

  @Field({ nullable: true })
  brand?: string;

  @Field({ nullable: true })
  gtin?: string;

  @Field({ nullable: true })
  mpn?: string;

  @Field({ nullable: true })
  currency?: string;

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

  @Field(() => Float, { nullable: true })
  rating?: number;

  @Field(() => Int, { nullable: true })
  ratingCount?: number;

  @Field(() => [String], { nullable: true })
  keywords?: string[];

  @Field(() => [String], { nullable: true })
  tags?: string[];

  @Field(() => [UpdateProductVariantInput], { nullable: true })
  variants?: UpdateProductVariantInput[];

  @Field(() => ProductSeoInput, { nullable: true })
  seo?: ProductSeoInput;
}
