import { ObjectType, Field, ID, GraphQLISODateTime } from '@nestjs/graphql';
import { Role } from '../common/enums/role.enum';
import GraphQLJSON from 'graphql-type-json';

@ObjectType()
export class User {
  @Field(() => ID)
  _id: string; 

  @Field()
  phoneNumber: string;

  @Field()
  firstName: string;

  @Field()
  lastName: string;

  @Field({ nullable: true })
  email?: string;

  @Field(() => GraphQLISODateTime)
  createdAt: Date;

  @Field(() => GraphQLISODateTime)
  updatedAt: Date;

  @Field(() => GraphQLISODateTime, { nullable: true })
  lastLoginAt?: Date;

  @Field(() => Number, { nullable: true })
  lifetimeValue?: number;

  @Field(() => Boolean, { nullable: true })
  marketingSmsOptIn?: boolean;

  @Field(() => GraphQLJSON, { nullable: true })
  signupSource?: any;

  @Field({nullable: true})
  lastIp: string;

  @Field(() => String)
  role: Role;

  @Field(() => Boolean)
  isPhoneVerified: boolean;

  @Field(() => [String])
  mergedGuestIds: string[];
}