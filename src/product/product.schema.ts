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

export type ProductDocument = Product & Document;

@ObjectType()
export class ProductImage {
  @Field()
  url: string;

  @Field()
  alt: string;
}

@ObjectType()
export class ProductVariant {
  @Field(() => ID)
  _id: string;

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

  @Field()
  discountSource: string;

  @Field(() => Float)
  weight: number;

  @Field()
  weightUnit: string;

  @Field()
  packageSize: string;

  @Field(() => Float)
  length: number;

  @Field(() => Float)
  height: number;

  @Field(() => Float)
  breadth: number;

  @Field(() => Int)
  stockQuantity: number;

  @Field()
  availabilityStatus: string;

  @Field(() => [ProductImage])
  images: ProductImage[];

  @Field()
  thumbnailUrl: string;

  @Field()
  isDefault: boolean;

  @Field()
  isActive: boolean;
}

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

  @Prop({ required: true })
  @Field()
  categoryId: string;

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
    type: [{
      _id: { type: String, required: true },
      sku: { type: String, required: true },
      name: { type: String, required: true },
      price: { type: Number, required: true },
      mrp: { type: Number, required: true },
      discountPercent: { type: Number, required: true },
      discountSource: { type: String, required: true, default: 'product' },
      weight: { type: Number, required: true },
      weightUnit: { type: String, required: true },
      packageSize: { type: String, required: true },
      length: { type: Number, required: true },
      height: { type: Number, required: true },
      breadth: { type: Number, required: true },
      stockQuantity: { type: Number, required: true, default: 0 },
      availabilityStatus: { type: String, required: true, default: 'in_stock' },
      images: { type: [{ url: String, alt: String }], required: true },
      thumbnailUrl: { type: String, required: true },
      isDefault: { type: Boolean, required: true, default: false },
      isActive: { type: Boolean, required: true, default: true },
    }],
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

  @Prop()
  @Field({ nullable: true })
  metaTitle?: string;

  @Prop()
  @Field({ nullable: true })
  metaDescription?: string;

  @Prop({ type: [String], default: [] })
  @Field(() => [String])
  metaKeywords: string[];

  @Prop()
  @Field({ nullable: true })
  canonicalUrl?: string;

  @Prop()
  @Field({ nullable: true })
  ogTitle?: string;

  @Prop()
  @Field({ nullable: true })
  ogDescription?: string;

  @Prop()
  @Field({ nullable: true })
  ogImage?: string;

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

ProductSchema.index({ categoryId: 1 });
ProductSchema.index({ 'variants.sku': 1 });
ProductSchema.index({ 'variants._id': 1 });
ProductSchema.index({ keywords: 1 });
ProductSchema.index({ 'variants.availabilityStatus': 1 });
ProductSchema.index({ createdAt: -1 });
