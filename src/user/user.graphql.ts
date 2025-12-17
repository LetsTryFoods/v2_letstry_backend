import { ObjectType, Field, Int } from '@nestjs/graphql';
import { Identity } from '../common/schemas/identity.schema';
import { PaginationMeta } from '../common/pagination';
import GraphQLJSON from 'graphql-type-json';

@ObjectType()
export class PlatformStats {
  @Field(() => Int)
  android: number;

  @Field(() => Int)
  ios: number;

  @Field(() => Int)
  web: number;
}

@ObjectType()
export class StatusStats {
  @Field(() => Int)
  guest: number;

  @Field(() => Int)
  registered: number;

  @Field(() => Int)
  verified: number;

  @Field(() => Int)
  active: number;

  @Field(() => Int)
  suspended: number;
}

@ObjectType()
export class CustomerSummary {
  @Field(() => Int)
  totalCustomers: number;

  @Field(() => Int)
  totalGuests: number;

  @Field(() => Int)
  totalRegistered: number;

  @Field(() => Int)
  totalRevenue: number;

  @Field(() => Int)
  newThisMonth: number;

  @Field(() => PlatformStats)
  platformStats: PlatformStats;

  @Field(() => StatusStats)
  statusStats: StatusStats;
}

@ObjectType()
export class EnrichedCustomer extends Identity {
  @Field(() => Int)
  totalOrders: number;

  @Field(() => Int)
  totalSpent: number;

  @Field(() => Int, { nullable: true })
  activeCartItemsCount?: number;

  @Field({ nullable: true })
  displayPhone?: string;

  @Field()
  isGuest: boolean;
}

@ObjectType()
export class PaginatedCustomersResponse {
  @Field(() => [EnrichedCustomer])
  customers: EnrichedCustomer[];

  @Field(() => PaginationMeta)
  meta: PaginationMeta;

  @Field(() => CustomerSummary)
  summary: CustomerSummary;
}

@ObjectType()
export class CustomerDetails extends Identity {
  @Field(() => Int)
  totalOrders: number;

  @Field(() => Int)
  totalSpent: number;

  @Field()
  isGuest: boolean;

  @Field(() => GraphQLJSON)
  orders: any[];

  @Field(() => GraphQLJSON, { nullable: true })
  activeCart?: any;

  @Field(() => GraphQLJSON)
  addresses: any[];
}
