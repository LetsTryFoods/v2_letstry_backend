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

  @Prop({ required: true })
  @Field()
  sku: string;

  @Prop()
  @Field({ nullable: true })
  gtin?: string;

  @Prop()
  @Field({ nullable: true })
  mpn?: string;

  @Prop({ type: [{ url: String, alt: String }], required: true })
  @Field(() => [ProductImage])
  images: ProductImage[];

  @Prop({ required: true })
  @Field()
  thumbnailUrl: string;

  @Prop({ required: true, type: Number })
  @Field(() => Float)
  price: number;

  @Prop({ required: true, type: Number })
  @Field(() => Float)
  mrp: number;

  @Prop({ required: true, type: Number })
  @Field(() => Float)
  discountPercent: number;

  @Prop({ required: true, default: 'INR' })
  @Field()
  currency: string;

  @Prop({ required: true, type: Number })
  @Field(() => Float)
  length: number;

  @Prop({ required: true, type: Number })
  @Field(() => Float)
  height: number;

  @Prop({ required: true, type: Number })
  @Field(() => Float)
  breadth: number;

  @Prop({ required: true, type: Number })
  @Field(() => Float)
  weight: number;

  @Prop({ required: true, default: 'g' })
  @Field()
  weightUnit: string;

  @Prop({ required: true })
  @Field()
  packageSize: string;

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

  @Prop({ required: true, default: 'in_stock' })
  @Field()
  availabilityStatus: string;

  @Prop({ required: true, type: Number, default: 0 })
  @Field(() => Int)
  stockQuantity: number;

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

  @Prop({ required: true, default: 'product' })
  @Field()
  discountSource: string;

  @Prop({ default: false })
  @Field()
  isArchived: boolean;

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
ProductSchema.index({ sku: 1 });
ProductSchema.index({ keywords: 1 });
ProductSchema.index({ availabilityStatus: 1 });
ProductSchema.index({ createdAt: -1 });
