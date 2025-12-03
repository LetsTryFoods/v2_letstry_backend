import { InputType, Field, ID } from '@nestjs/graphql';

@InputType()
export class CreateCategoryInput {
  @Field()
  name: string;

  @Field({ nullable: true })
  slug?: string;

  @Field({ nullable: true })
  description?: string;

  @Field(() => String, { nullable: true })
  parentId?: string;

  @Field({ nullable: true })
  imageUrl?: string;

  @Field()
  codeValue: string;

  @Field()
  inCodeSet: string;

  @Field({ nullable: true })
  isArchived?: boolean;
}

@InputType()
export class UpdateCategoryInput {
  @Field({ nullable: true })
  name?: string;

  @Field({ nullable: true })
  slug?: string;

  @Field({ nullable: true })
  description?: string;

  @Field(() => String, { nullable: true })
  parentId?: string;

  @Field({ nullable: true })
  imageUrl?: string;

  @Field({ nullable: true })
  codeValue?: string;

  @Field({ nullable: true })
  inCodeSet?: string;

  @Field({ nullable: true })
  isArchived?: boolean;
}
