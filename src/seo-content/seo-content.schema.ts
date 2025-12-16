import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { ObjectType, Field, ID, GraphQLISODateTime } from '@nestjs/graphql';

export type SeoContentDocument = SeoContent & Document;

@Schema({ timestamps: true })
@ObjectType()
export class SeoContent {
  @Field(() => ID)
  _id: string;

  @Prop({ required: true })
  @Field()
  pageName: string;

  @Prop({ required: true, unique: true, index: true })
  @Field()
  pageSlug: string;

  @Prop({ required: true })
  @Field()
  metaTitle: string;

  @Prop({ required: true })
  @Field()
  metaDescription: string;

  @Prop()
  @Field({ nullable: true })
  metaKeywords?: string;

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

  @Prop({ default: true })
  @Field()
  isActive: boolean;

  @Field(() => GraphQLISODateTime)
  createdAt: Date;

  @Field(() => GraphQLISODateTime)
  updatedAt: Date;
}

export const SeoContentSchema = SchemaFactory.createForClass(SeoContent);

// Create indexes for better query performance
SeoContentSchema.index({ pageSlug: 1 }, { unique: true });
SeoContentSchema.index({ isActive: 1 });
SeoContentSchema.index({ createdAt: -1 });
