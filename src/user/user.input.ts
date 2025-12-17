import { InputType, Field, registerEnumType } from '@nestjs/graphql';
import { PaginationInput } from '../common/pagination';
import GraphQLISODateTime from 'graphql-type-json';

export enum CustomerPlatform {
  ANDROID = 'android',
  IOS = 'ios',
  WEB = 'web',
}

export enum CustomerSortField {
  CREATED_AT = 'CREATED_AT',
  TOTAL_SPENT = 'TOTAL_SPENT',
  TOTAL_ORDERS = 'TOTAL_ORDERS',
  LAST_ACTIVE = 'LAST_ACTIVE',
}

export enum SortOrder {
  ASC = 'ASC',
  DESC = 'DESC',
}

registerEnumType(CustomerPlatform, {
  name: 'CustomerPlatform',
});

registerEnumType(CustomerSortField, {
  name: 'CustomerSortField',
});

registerEnumType(SortOrder, {
  name: 'SortOrder',
});

@InputType()
export class GetCustomersInput extends PaginationInput {
  @Field({ nullable: true })
  status?: string;

  @Field(() => CustomerPlatform, { nullable: true })
  platform?: CustomerPlatform;

  @Field({ nullable: true })
  searchTerm?: string;

  @Field(() => GraphQLISODateTime, { nullable: true })
  startDate?: Date;

  @Field(() => GraphQLISODateTime, { nullable: true })
  endDate?: Date;

  @Field(() => CustomerSortField, { nullable: true })
  sortBy?: CustomerSortField;

  @Field(() => SortOrder, { nullable: true })
  sortOrder?: SortOrder;

  @Field({ nullable: true })
  minSpent?: number;

  @Field({ nullable: true })
  maxSpent?: number;
}
