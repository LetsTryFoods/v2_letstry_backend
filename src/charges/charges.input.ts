import { InputType, Field, Float } from '@nestjs/graphql';

@InputType()
export class CreateChargesInput {
  @Field(() => Boolean, { nullable: true })
  active?: boolean;

  @Field(() => Float, { nullable: true })
  handlingCharge?: number;

  @Field(() => Float, { nullable: true })
  gstPercentage?: number;

  @Field(() => Float, { nullable: true })
  freeDeliveryThreshold?: number;

  @Field(() => Float, { nullable: true })
  deliveryDelhiBelowThreshold?: number;

  @Field(() => Float, { nullable: true })
  deliveryRestBelowThreshold?: number;
}
