import { InputType, Field } from '@nestjs/graphql';
import GraphQLJSON from 'graphql-type-json';

@InputType()
export class CreateUserInput {
  @Field()
  phoneNumber: string;

  @Field()
  firebaseUid: string;

  @Field({ nullable: true })
  first_name?: string;

  @Field({ nullable: true })
  last_name?: string;

  @Field({ nullable: true })
  email?: string;

  @Field({ nullable: true })
  marketing_sms_opt_in?: boolean;

  @Field(() => GraphQLJSON, { nullable: true })
  signup_source?: any;

  @Field({ nullable: true })
  last_ip?: string;
}