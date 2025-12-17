import { InputType, Field, registerEnumType } from '@nestjs/graphql';
import { PaginationInput } from '../common/pagination';

export enum CustomerPlatform {
  ANDROID = 'android',
  IOS = 'ios',
  WEB = 'web',
}

registerEnumType(CustomerPlatform, {
  name: 'CustomerPlatform',
});

@InputType()
export class GetCustomersInput extends PaginationInput {
  @Field({ nullable: true })
  status?: string;

  @Field(() => CustomerPlatform, { nullable: true })
  platform?: CustomerPlatform;

  @Field({ nullable: true })
  searchTerm?: string;
}
