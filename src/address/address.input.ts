import { InputType, Field } from '@nestjs/graphql';
import { IsNotEmpty, IsString, IsOptional, IsBoolean } from 'class-validator';

@InputType()
export class CreateAddressInput {
  @Field()
  @IsNotEmpty()
  @IsString()
  name: string;

  @Field()
  @IsNotEmpty()
  @IsString()
  streetAddress: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  extendedAddress?: string;

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

  @Field()
  @IsNotEmpty()
  @IsString()
  telephone: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

@InputType()
export class UpdateAddressInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  name?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  streetAddress?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  extendedAddress?: string;

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
  @IsString()
  telephone?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
