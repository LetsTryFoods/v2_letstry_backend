import { InputType, Field, Float } from '@nestjs/graphql';
import { IsNotEmpty, IsString, IsOptional, IsBoolean, IsNumber } from 'class-validator';

@InputType()
export class CreateAddressInput {
  @Field()
  @IsNotEmpty()
  @IsString()
  addressType: string;

  @Field()
  @IsNotEmpty()
  @IsString()
  recipientPhone: string;

  @Field()
  @IsNotEmpty()
  @IsString()
  recipientName: string;

  @Field()
  @IsNotEmpty()
  @IsString()
  buildingName: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  floor?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  streetArea?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  landmark?: string;

  @Field()
  @IsNotEmpty()
  @IsString()
  addressLocality: string;

  @Field()
  @IsNotEmpty()
  @IsString()
  addressRegion: string;

  @Field()
  @IsNotEmpty()
  @IsString()
  postalCode: string;

  @Field()
  @IsNotEmpty()
  @IsString()
  addressCountry: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @Field(() => Float)
  @IsNotEmpty()
  @IsNumber()
  latitude: number;

  @Field(() => Float)
  @IsNotEmpty()
  @IsNumber()
  longitude: number;

  @Field()
  @IsNotEmpty()
  @IsString()
  formattedAddress: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  placeId?: string;
}

@InputType()
export class UpdateAddressInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  addressType?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  recipientPhone?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  recipientName?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  buildingName?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  floor?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  streetArea?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  landmark?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  addressLocality?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  addressRegion?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  postalCode?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  addressCountry?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @Field(() => Float, { nullable: true })
  @IsOptional()
  @IsNumber()
  latitude?: number;

  @Field(() => Float, { nullable: true })
  @IsOptional()
  @IsNumber()
  longitude?: number;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  formattedAddress?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  placeId?: string;
}

@InputType()
export class GeocodeAddressInput {
  @Field()
  @IsNotEmpty()
  @IsString()
  address: string;
}

@InputType()
export class ReverseGeocodeInput {
  @Field()
  @IsNotEmpty()
  latitude: number;

  @Field()
  @IsNotEmpty()
  longitude: number;
}

@InputType()
export class SearchPlacesInput {
  @Field()
  @IsNotEmpty()
  @IsString()
  query: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  sessionToken?: string;
}

@InputType()
export class PlaceDetailsInput {
  @Field()
  @IsNotEmpty()
  @IsString()
  placeId: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  sessionToken?: string;
}
