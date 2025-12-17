import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import {
  ObjectType,
  Field,
  ID,
  Float,
  Int,
  GraphQLISODateTime,
} from '@nestjs/graphql';
import { ProductSeo } from './product-seo.schema';

export type ProductDocument = Product & Document;

@ObjectType()
export class ProductImage {
  @Field()
  url: string;

  @Field()
  alt: string;
}

@Schema({ _id: true })
@ObjectType()
export class ProductVariant {
  @Field(() => ID)
  _id: string;

  @Prop({ required: true })
  @Field()
  sku: string;

  @Prop({ required: true })
  @Field()
  name: string;

  @Prop({ required: true })
  @Field(() => Float)
  price: number;

  @Prop({ required: true })
  @Field(() => Float)
  mrp: number;

  @Prop({ required: true })
  @Field(() => Float)
  discountPercent: number;

  @Prop({ required: true, default: 'product' })
  @Field()
  discountSource: string;

  @Prop({ required: true })
  @Field(() => Float)
  weight: number;

  @Prop({ required: true })
  @Field()
  weightUnit: string;

  @Prop({ required: true })
  @Field()
  packageSize: string;

  @Prop({ required: true })
  @Field(() => Float)
  length: number;

  @Prop({ required: true })
  @Field(() => Float)
  height: number;

  @Prop({ required: true })
  @Field(() => Float)
  breadth: number;

  @Prop({ required: true, default: 0 })
  @Field(() => Int)
  stockQuantity: number;

  @Prop({ required: true, default: 'in_stock' })
  @Field()
  availabilityStatus: string;

  @Prop({ type: [{ url: String, alt: String }], required: true })
  @Field(() => [ProductImage])
  images: ProductImage[];

  @Prop({ required: true })
  @Field()
  thumbnailUrl: string;

  @Prop({ required: true, default: false })
  @Field()
  isDefault: boolean;

  @Prop({ required: true, default: true })
  @Field()
  isActive: boolean;
}

export const ProductVariantSchema = SchemaFactory.createForClass(ProductVariant);

@Schema({ timestamps: true })
@ObjectType()
export class Product {
  @Field(() => ID)
  _id: string;

  @Prop({ required: true })
  @Field()
  name: string;

  @Prop({ nullable: true })
  @Field({ nullable: true })
  favourite?: boolean;

  @Prop({ required: true, unique: true })
  @Field()
  slug: string;

  @Prop({ required: true })
  @Field()
  description: string;

  @Prop({ type: [String], required: true, default: [] })
  @Field(() => [String])
  categoryIds: string[];

  @Prop({ required: true })
  @Field()
  brand: string;

  @Prop()
  @Field({ nullable: true })
  gtin?: string;

  @Prop()
  @Field({ nullable: true })
  mpn?: string;

  @Prop({ required: true, default: 'INR' })
  @Field()
  currency: string;

  @Prop({ required: true })
  @Field()
  ingredients: string;

  @Prop()
  @Field({ nullable: true })
  allergens?: string;

  @Prop({ required: true })
  @Field()
  shelfLife: string;

  @Prop({ required: true, default: true })
  @Field()
  isVegetarian: boolean;

  @Prop({ required: true, default: false })
  @Field()
  isGlutenFree: boolean;

  @Prop({
    type: [ProductVariantSchema],
    required: true,
  })
  @Field(() => [ProductVariant])
  variants: ProductVariant[];

  @Prop({ type: Number })
  @Field(() => Float, { nullable: true })
  rating?: number;

  @Prop({ type: Number, default: 0 })
  @Field(() => Int)
  ratingCount: number;

  @Prop({ type: [String], default: [] })
  @Field(() => [String])
  keywords: string[];

  @Prop({ type: [String], default: [] })
  @Field(() => [String])
  tags: string[];

  @Prop({ default: false })
  @Field()
  isArchived: boolean;

  @Field(() => ProductSeo, { nullable: true })
  seo?: ProductSeo;

  @Field(() => GraphQLISODateTime)
  createdAt: Date;

  @Field(() => GraphQLISODateTime)
  updatedAt: Date;
}

export const ProductSchema = SchemaFactory.createForClass(Product);

ProductSchema.virtual('id').get(function (this: any) {
  return this._id?.toString();
});

ProductSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: function (_: any, ret: any) {
    if (ret._id) {
      ret.id = ret._id.toString();
      delete ret._id;
    }
    delete ret.__v;
  },
});

ProductSchema.index({ categoryIds: 1 });
ProductSchema.index({ 'variants.sku': 1 });
ProductSchema.index({ 'variants._id': 1 });
ProductSchema.index({ keywords: 1 });
ProductSchema.index({ 'variants.availabilityStatus': 1 });
ProductSchema.index({ createdAt: -1 });
