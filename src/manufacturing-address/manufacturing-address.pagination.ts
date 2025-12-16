import { ObjectType, Field } from '@nestjs/graphql';
import { ManufacturingAddress } from './manufacturing-address.schema';
import { PaginationMeta } from '../common/pagination';

@ObjectType()
export class PaginatedManufacturingAddresses {
  @Field(() => [ManufacturingAddress])
  items: ManufacturingAddress[];

  @Field(() => PaginationMeta)
  meta: PaginationMeta;
}
