import { InputType, Field, Float, Int } from '@nestjs/graphql';
import { DiscountType, EligibilityType, ApplicationScope } from './coupon.schema';

@InputType()
export class CreateCouponInput {
  @Field()
  name: string;

  @Field()
  description: string;

  @Field()
  code: string;

  @Field(() => DiscountType)
  discountType: DiscountType;

  @Field(() => Float)
  discountValue: number;

  @Field(() => Float, { nullable: true })
  minCartValue?: number;

  @Field(() => Float, { nullable: true })
  maxDiscountAmount?: number;

  @Field()
  startDate: Date;

  @Field()
  endDate: Date;

  @Field({ nullable: true })
  isActive?: boolean;

  @Field(() => EligibilityType, { nullable: true })
  eligibilityType?: EligibilityType;

  @Field(() => ApplicationScope, { nullable: true })
  applicationScope?: ApplicationScope;

  @Field(() => Int, { nullable: true })
  usageLimit?: number;
}
