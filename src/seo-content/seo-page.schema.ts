import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { ObjectType, Field, ID, GraphQLISODateTime } from '@nestjs/graphql';

export type SeoPageDocument = SeoPage & Document;

@Schema({ timestamps: true })
@ObjectType()
export class SeoPage {
  @Field(() => ID)
  _id: string;

  @Prop({ required: true, unique: true, index: true })
  @Field()
  slug: string;

  @Prop({ required: true })
  @Field()
  label: string;

  @Prop()
  @Field({ nullable: true })
  description?: string;

  @Prop({ default: 0 })
  @Field()
  sortOrder: number;

  @Prop({ default: true })
  @Field()
  isActive: boolean;

  @Field(() => GraphQLISODateTime)
  createdAt: Date;

  @Field(() => GraphQLISODateTime)
  updatedAt: Date;
}

export const SeoPageSchema = SchemaFactory.createForClass(SeoPage);

// Create indexes
SeoPageSchema.index({ slug: 1 }, { unique: true });
SeoPageSchema.index({ isActive: 1 });
SeoPageSchema.index({ sortOrder: 1 });
