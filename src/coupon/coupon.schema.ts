import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { ObjectType, Field, ID, Float, Int, registerEnumType } from '@nestjs/graphql';

export type CouponDocument = Coupon & Document;

export enum DiscountType {
  PERCENTAGE = 'PERCENTAGE',
  FIXED = 'FIXED',
}

export enum EligibilityType {
  MINIMUM_VALUE = 'MINIMUM_VALUE',
  NO_MINIMUM = 'NO_MINIMUM',
}

export enum ApplicationScope {
  ON_TOTAL_AMOUNT = 'ON_TOTAL_AMOUNT',
  ON_PRODUCT_MRP = 'ON_PRODUCT_MRP',
  ON_SUBTOTAL = 'ON_SUBTOTAL',
}

registerEnumType(DiscountType, { name: 'DiscountType' });
registerEnumType(EligibilityType, { name: 'EligibilityType' });
registerEnumType(ApplicationScope, { name: 'ApplicationScope' });

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

  @Prop({ required: true, enum: EligibilityType, default: EligibilityType.NO_MINIMUM })
  @Field(() => EligibilityType)
  eligibilityType: EligibilityType;

  @Prop({ required: true, enum: ApplicationScope, default: ApplicationScope.ON_TOTAL_AMOUNT })
  @Field(() => ApplicationScope)
  applicationScope: ApplicationScope;

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
