import { ObjectType, Field, Int } from '@nestjs/graphql';
import { Identity } from '../common/schemas/identity.schema';
import { PaginationMeta } from '../common/pagination';

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

  @Field(() => PlatformStats)
  platformStats: PlatformStats;

  @Field(() => StatusStats)
  statusStats: StatusStats;
}

@ObjectType()
export class PaginatedCustomersResponse {
  @Field(() => [Identity])
  customers: Identity[];

  @Field(() => PaginationMeta)
  meta: PaginationMeta;

  @Field(() => CustomerSummary)
  summary: CustomerSummary;
}
