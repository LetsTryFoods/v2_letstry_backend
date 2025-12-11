import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { ObjectType, Field, ID, GraphQLISODateTime } from '@nestjs/graphql';
import GraphQLJSON from 'graphql-type-json';

export type GuestDocument = Guest & Document;

@Schema()
@ObjectType()
export class Guest {
  @Field(() => ID)
  _id: string;

  @Prop({ required: true, unique: true, sparse: true })
  @Field()
  guestId: string;

  @Prop({ required: true, unique: true, sparse: true })
  @Field()
  sessionId: string;

  @Prop({ required: true, type: Date, default: Date.now })
  @Field(() => GraphQLISODateTime)
  createdAt: Date;

  @Prop({ required: true, type: Date, default: Date.now })
  @Field(() => GraphQLISODateTime)
  lastActiveAt: Date;

  @Prop()
  @Field({ nullable: true })
  ipAddress?: string;

  @Prop({ type: Object })
  @Field(() => GraphQLJSON, { nullable: true })
  deviceInfo?: any;

  @Prop()
  @Field(() => ID, { nullable: true })
  convertedToUserId?: string;
}

export const GuestSchema = SchemaFactory.createForClass(Guest);
