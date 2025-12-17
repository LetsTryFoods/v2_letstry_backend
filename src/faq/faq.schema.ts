import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { ObjectType, Field, ID, GraphQLISODateTime, registerEnumType } from '@nestjs/graphql';

export type FAQDocument = FAQ & Document;

// Enums
export enum FAQStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

export enum FAQCategory {
  GENERAL = 'GENERAL',
  ORDERS = 'ORDERS',
  SHIPPING = 'SHIPPING',
  PAYMENT = 'PAYMENT',
  RETURNS = 'RETURNS',
  PRODUCTS = 'PRODUCTS',
}

// Register enums for GraphQL
registerEnumType(FAQStatus, {
  name: 'FAQStatus',
  description: 'FAQ status enum',
});

registerEnumType(FAQCategory, {
  name: 'FAQCategory',
  description: 'FAQ category enum',
});

@Schema({ timestamps: true })
@ObjectType()
export class FAQ {
  @Field(() => ID)
  _id: string;

  @Prop({ required: true })
  @Field()
  question: string;

  @Prop({ required: true })
  @Field()
  answer: string;

  @Prop({ type: String, enum: FAQCategory, default: FAQCategory.GENERAL })
  @Field(() => FAQCategory)
  category: FAQCategory;

  @Prop({ type: String, enum: FAQStatus, default: FAQStatus.ACTIVE })
  @Field(() => FAQStatus)
  status: FAQStatus;

  @Prop({ default: 0 })
  @Field()
  order: number;

  @Field(() => GraphQLISODateTime)
  createdAt: Date;

  @Field(() => GraphQLISODateTime)
  updatedAt: Date;
}

export const FAQSchema = SchemaFactory.createForClass(FAQ);

// Indexes
FAQSchema.index({ category: 1 });
FAQSchema.index({ status: 1 });
FAQSchema.index({ order: 1 });

// Virtual for id
FAQSchema.virtual('id').get(function (this: any) {
  return this._id?.toString();
});

FAQSchema.set('toJSON', {
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
