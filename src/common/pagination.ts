import { ObjectType, Field, Int, InputType } from '@nestjs/graphql';

@InputType()
export class PaginationInput {
  @Field(() => Int, { defaultValue: 1 })
  page?: number = 1;

  @Field(() => Int, { defaultValue: 10 })
  limit?: number = 10;
}

@ObjectType()
export class PaginationMeta {
  @Field(() => Int)
  totalCount: number;

  @Field(() => Int)
  page: number;

  @Field(() => Int)
  limit: number;

  @Field(() => Int)
  totalPages: number;

  @Field()
  hasNextPage: boolean;

  @Field()
  hasPreviousPage: boolean;
}

@ObjectType()
export class PaginatedProducts {
  @Field(() => [require('../product/product.graphql').Product])
  items: any[];

  @Field(() => PaginationMeta)
  meta: PaginationMeta;
}

@ObjectType()
export class PaginatedCategories {
  @Field(() => [require('../category/category.graphql').Category])
  items: any[];

  @Field(() => PaginationMeta)
  meta: PaginationMeta;
}

export class PaginationResult<T> {
  items: T[];
  meta: {
    totalCount: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}
