import { InputType, Field } from '@nestjs/graphql';
import { IsNotEmpty, IsString, IsOptional, IsBoolean, Matches } from 'class-validator';

@InputType()
export class CreateManufacturingAddressInput {
  @Field()
  @IsNotEmpty({ message: 'Batch code is required' })
  @IsString()
  batchCode: string;

  @Field()
  @IsNotEmpty({ message: 'Address heading is required' })
  @IsString()
  addressHeading: string;

  @Field()
  @IsNotEmpty({ message: 'Sub address heading is required' })
  @IsString()
  subAddressHeading: string;

  @Field()
  @IsNotEmpty({ message: 'FSSAI license number is required' })
  @IsString()
  @Matches(/^[0-9]{14}$/, { message: 'FSSAI license number must be 14 digits' })
  fssaiLicenseNumber: string;

  @Field({ nullable: true, defaultValue: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

@InputType()
export class UpdateManufacturingAddressInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  batchCode?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  addressHeading?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  subAddressHeading?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @Matches(/^[0-9]{14}$/, { message: 'FSSAI license number must be 14 digits' })
  fssaiLicenseNumber?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
