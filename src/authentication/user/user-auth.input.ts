import { InputType, Field } from '@nestjs/graphql';
import GraphQLJSON from 'graphql-type-json';

@InputType()
export class CreateUserInput {
  @Field()
  phoneNumber: string;

  @Field()
  firebaseUid: string;

  @Field({ nullable: true })
  firstName?: string;

  @Field({ nullable: true })
  lastName?: string;

  @Field({ nullable: true })
  email?: string;

  @Field({ nullable: true })
  marketingSmsOptIn?: boolean;

  @Field(() => GraphQLJSON, { nullable: true })
  signupSource?: any;

  @Field({ nullable: true })
  lastIp?: string;
}