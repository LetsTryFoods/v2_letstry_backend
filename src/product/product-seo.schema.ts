import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { ObjectType, Field, ID, GraphQLISODateTime } from '@nestjs/graphql';

export type ProductSeoDocument = ProductSeo & Document;

@Schema({ timestamps: true })
@ObjectType()
export class ProductSeo {
  @Field(() => ID)
  _id: string;

  @Prop({ required: true })
  @Field()
  productId: string;

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

export const ProductSeoSchema = SchemaFactory.createForClass(ProductSeo);

ProductSeoSchema.index({ productId: 1 }, { unique: true });
