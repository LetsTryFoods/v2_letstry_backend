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

  @Prop({ required: true, unique: true })
  @Field()
  guest_id: string;

  @Prop({ required: true, unique: true })
  @Field()
  session_id: string;

  @Prop({ required: true, type: Date, default: Date.now })
  @Field(() => GraphQLISODateTime)
  created_at: Date;

  @Prop({ required: true, type: Date, default: Date.now })
  @Field(() => GraphQLISODateTime)
  last_active_at: Date;

  @Prop()
  @Field({ nullable: true })
  ip_address?: string;

  @Prop({ type: Object })
  @Field(() => GraphQLJSON, { nullable: true })
  device_info?: any;

  @Prop()
  @Field(() => ID, { nullable: true })
  converted_to_user_id?: string;
}

export const GuestSchema = SchemaFactory.createForClass(Guest);
