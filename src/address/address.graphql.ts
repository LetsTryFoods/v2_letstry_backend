import { ObjectType, Field, Float } from '@nestjs/graphql';

@ObjectType()
export class GoogleMapsAddressOutput {
  @Field()
  formattedAddress: string;

  @Field({ nullable: true })
  streetAddress?: string;

  @Field({ nullable: true })
  extendedAddress?: string;

  @Field({ nullable: true })
  locality?: string;

  @Field({ nullable: true })
  region?: string;

  @Field({ nullable: true })
  postalCode?: string;

  @Field({ nullable: true })
  country?: string;

  @Field(() => Float)
  latitude: number;

  @Field(() => Float)
  longitude: number;
}

@ObjectType()
export class PlacePredictionOutput {
  @Field()
  placeId: string;

  @Field()
  description: string;

  @Field()
  mainText: string;

  @Field()
  secondaryText: string;
}

@ObjectType()
export class PlaceDetailsOutput {
  @Field()
  placeId: string;

  @Field()
  formattedAddress: string;

  @Field({ nullable: true })
  streetAddress?: string;

  @Field({ nullable: true })
  locality?: string;

  @Field({ nullable: true })
  region?: string;

  @Field({ nullable: true })
  postalCode?: string;

  @Field({ nullable: true })
  country?: string;

  @Field(() => Float)
  latitude: number;

  @Field(() => Float)
  longitude: number;
}

@ObjectType()
export class PhoneCheckOutput {
  @Field()
  exists: boolean;

  @Field()
  requiresLogin: boolean;

  @Field({ nullable: true })
  message?: string;
}
