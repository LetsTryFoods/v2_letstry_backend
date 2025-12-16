import { ObjectType, Field } from '@nestjs/graphql';
import { SeoContent } from './seo-content.schema';
import { PaginationMeta } from '../common/pagination';

@ObjectType()
export class PaginatedSeoContents {
  @Field(() => [SeoContent])
  items: SeoContent[];

  @Field(() => PaginationMeta)
  meta: PaginationMeta;
}
