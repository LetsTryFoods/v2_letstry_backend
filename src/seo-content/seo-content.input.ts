import { InputType, Field } from '@nestjs/graphql';
import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsBoolean,
  IsUrl,
  MaxLength,
  Matches,
} from 'class-validator';

@InputType()
export class CreateSeoContentInput {
  @Field()
  @IsNotEmpty({ message: 'Page name is required' })
  @IsString()
  @MaxLength(100, { message: 'Page name must be less than 100 characters' })
  pageName: string;

  @Field()
  @IsNotEmpty({ message: 'Page slug is required' })
  @IsString()
  @MaxLength(100, { message: 'Page slug must be less than 100 characters' })
  @Matches(/^[a-z0-9-]+$/, {
    message: 'Slug must contain only lowercase letters, numbers, and hyphens',
  })
  pageSlug: string;

  @Field()
  @IsNotEmpty({ message: 'Meta title is required' })
  @IsString()
  @MaxLength(70, {
    message: 'Meta title should be less than 70 characters for best SEO',
  })
  metaTitle: string;

  @Field()
  @IsNotEmpty({ message: 'Meta description is required' })
  @IsString()
  @MaxLength(160, {
    message: 'Meta description should be less than 160 characters for best SEO',
  })
  metaDescription: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Keywords must be less than 500 characters' })
  metaKeywords?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @IsUrl({}, { message: 'Must be a valid URL' })
  canonicalUrl?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(95, {
    message: 'Social title should be less than 95 characters',
  })
  ogTitle?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(200, {
    message: 'Social description should be less than 200 characters',
  })
  ogDescription?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @IsUrl({}, { message: 'Must be a valid URL' })
  ogImage?: string;

  @Field({ nullable: true, defaultValue: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

@InputType()
export class UpdateSeoContentInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'Page name must be less than 100 characters' })
  pageName?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'Page slug must be less than 100 characters' })
  @Matches(/^[a-z0-9-]+$/, {
    message: 'Slug must contain only lowercase letters, numbers, and hyphens',
  })
  pageSlug?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(70, {
    message: 'Meta title should be less than 70 characters for best SEO',
  })
  metaTitle?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(160, {
    message: 'Meta description should be less than 160 characters for best SEO',
  })
  metaDescription?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Keywords must be less than 500 characters' })
  metaKeywords?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  canonicalUrl?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(95, {
    message: 'Social title should be less than 95 characters',
  })
  ogTitle?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(200, {
    message: 'Social description should be less than 200 characters',
  })
  ogDescription?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  ogImage?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
