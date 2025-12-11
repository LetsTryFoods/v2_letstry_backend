import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class ProductSeoInput {
  @Field({ nullable: true })
  metaTitle?: string;

  @Field({ nullable: true })
  metaDescription?: string;

  @Field(() => [String], { nullable: true })
  metaKeywords?: string[];

  @Field({ nullable: true })
  canonicalUrl?: string;

  @Field({ nullable: true })
  ogTitle?: string;

  @Field({ nullable: true })
  ogDescription?: string;

  @Field({ nullable: true })
  ogImage?: string;
}
