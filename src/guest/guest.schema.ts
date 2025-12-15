import { ObjectType, Field, ID, GraphQLISODateTime } from '@nestjs/graphql';
import GraphQLJSON from 'graphql-type-json';

@ObjectType()
export class Guest {
  @Field(() => ID)
  _id: string;

  @Field()
  guestId: string;

  @Field()
  sessionId: string;

  @Field(() => GraphQLISODateTime)
  createdAt: Date;

  @Field(() => GraphQLISODateTime)
  lastActiveAt: Date;

  @Field({ nullable: true })
  ipAddress?: string;

  @Field(() => GraphQLJSON, { nullable: true })
  deviceInfo?: any;

  @Field(() => ID, { nullable: true })
  convertedToUserId?: string;
}
