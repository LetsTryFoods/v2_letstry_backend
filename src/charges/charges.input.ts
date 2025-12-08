import { InputType, Field, Float } from '@nestjs/graphql';

@InputType()
export class CreateChargesInput {
  @Field({ nullable: true })
  active?: boolean;

  @Field(() => Float)
  handlingCharge: number;

  @Field(() => Float)
  gstPercentage: number;

  @Field(() => Float)
  freeDeliveryThreshold: number;

  @Field(() => Float)
  deliveryDelhiBelowThreshold: number;

  @Field(() => Float)
  deliveryRestBelowThreshold: number;
}
