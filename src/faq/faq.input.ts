import { InputType, Field, Int, PartialType, ID } from '@nestjs/graphql';
import { IsString, IsNotEmpty, IsOptional, IsEnum, IsInt, Min } from 'class-validator';
import { FAQStatus, FAQCategory } from './faq.schema';

@InputType()
export class CreateFAQInput {
  @Field()
  @IsString()
  @IsNotEmpty({ message: 'Question is required' })
  question: string;

  @Field()
  @IsString()
  @IsNotEmpty({ message: 'Answer is required' })
  answer: string;

  @Field(() => FAQCategory, { defaultValue: FAQCategory.GENERAL })
  @IsEnum(FAQCategory)
  @IsOptional()
  category?: FAQCategory;

  @Field(() => FAQStatus, { defaultValue: FAQStatus.ACTIVE })
  @IsEnum(FAQStatus)
  @IsOptional()
  status?: FAQStatus;

  @Field(() => Int, { defaultValue: 0 })
  @IsInt()
  @Min(0)
  @IsOptional()
  order?: number;
}

@InputType()
export class UpdateFAQInput extends PartialType(CreateFAQInput) {
  @Field(() => ID)
  @IsString()
  @IsNotEmpty()
  id: string;
}

@InputType()
export class FAQFilterInput {
  @Field(() => FAQCategory, { nullable: true })
  @IsEnum(FAQCategory)
  @IsOptional()
  category?: FAQCategory;

  @Field(() => FAQStatus, { nullable: true })
  @IsEnum(FAQStatus)
  @IsOptional()
  status?: FAQStatus;

  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  searchQuery?: string;
}
