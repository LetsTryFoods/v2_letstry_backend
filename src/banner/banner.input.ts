import { InputType, Field, ID } from '@nestjs/graphql';

@InputType()
export class CreateBannerInput {
  @Field()
  name: string;

  @Field()
  headline: string;

  @Field()
  subheadline: string;

  @Field({ nullable: true })
  description?: string;

  @Field()
  imageUrl: string;

  @Field()
  mobileImageUrl: string;

  @Field({ nullable: true })
  thumbnailUrl?: string;

  @Field()
  url: string;

  @Field()
  ctaText: string;

  @Field(() => Number)
  position: number;

  @Field({ nullable: true })
  isActive?: boolean;

  @Field({ nullable: true })
  startDate?: Date;

  @Field({ nullable: true })
  endDate?: Date;

  @Field({ nullable: true })
  backgroundColor?: string;

  @Field({ nullable: true })
  textColor?: string;
}

@InputType()
export class UpdateBannerInput {
  @Field({ nullable: true })
  name?: string;

  @Field({ nullable: true })
  headline?: string;

  @Field({ nullable: true })
  subheadline?: string;

  @Field({ nullable: true })
  description?: string;

  @Field({ nullable: true })
  imageUrl?: string;

  @Field({ nullable: true })
  mobileImageUrl?: string;

  @Field({ nullable: true })
  thumbnailUrl?: string;

  @Field({ nullable: true })
  url?: string;

  @Field({ nullable: true })
  ctaText?: string;

  @Field(() => Number, { nullable: true })
  position?: number;

  @Field({ nullable: true })
  isActive?: boolean;

  @Field({ nullable: true })
  startDate?: Date;

  @Field({ nullable: true })
  endDate?: Date;

  @Field({ nullable: true })
  backgroundColor?: string;

  @Field({ nullable: true })
  textColor?: string;
}
