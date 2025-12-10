import { ObjectType, Field, ID } from '@nestjs/graphql';

@ObjectType()
export class Category {
  @Field(() => ID)
  id: string;

  @Field()
  name: string;

  @Field()
  slug: string;

  @Field({ nullable: true })
  description?: string;

  @Field(() => String, { nullable: true })
  parentId?: string;

  @Field({ nullable: true })
  favourite?: boolean;

  @Field({ nullable: true })
  imageUrl?: string;

  @Field()
  codeValue: string;

  @Field()
  inCodeSet: string;

  @Field()
  productCount: number;

  @Field()
  isArchived: boolean;

  @Field(() => [require('../product/product.graphql').Product], {
    nullable: true,
  })
  products?: any[];

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}
