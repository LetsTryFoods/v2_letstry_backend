import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { ObjectType, Field, ID, Float, Int, registerEnumType } from '@nestjs/graphql';

export type CouponDocument = Coupon & Document;

export enum DiscountType {
  PERCENTAGE = 'PERCENTAGE',
  FIXED = 'FIXED',
}

registerEnumType(DiscountType, { name: 'DiscountType' });

@Schema({ timestamps: true })
@ObjectType()
export class Coupon {
  @Field(() => ID)
  _id: string;

  @Prop({ required: true })
  @Field()
  name: string;

  @Prop({ required: true })
  @Field()
  description: string;

  @Prop({ required: true, unique: true, index: true })
  @Field()
  code: string;

  @Prop({ required: true, enum: DiscountType })
  @Field(() => DiscountType)
  discountType: DiscountType;

  @Prop({ required: true })
  @Field(() => Float)
  discountValue: number;

  @Prop({ default: 0 })
  @Field(() => Float, { nullable: true })
  minCartValue?: number;

  @Prop()
  @Field(() => Float, { nullable: true })
  maxDiscountAmount?: number;

  @Prop({ required: true })
  @Field()
  startDate: Date;

  @Prop({ required: true })
  @Field()
  endDate: Date;

  @Prop({ default: true })
  @Field()
  isActive: boolean;

  @Prop()
  @Field(() => Int, { nullable: true })
  usageLimit?: number;

  @Prop({ default: 0 })
  @Field(() => Int)
  usageCount: number;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}

export const CouponSchema = SchemaFactory.createForClass(Coupon);
