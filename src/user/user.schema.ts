import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { ObjectType, Field, ID, GraphQLISODateTime } from '@nestjs/graphql';
import { Role } from '../common/enums/role.enum';
import GraphQLJSON from 'graphql-type-json';

export type UserDocument = User & Document;

@Schema()
@ObjectType()
export class User {
  @Field(() => ID)
  _id: string; 

  @Prop({ required: true, unique: true })
  @Field()
  phoneNumber: string;

  @Prop()
  @Field()
  first_name: string;

  @Prop()
  @Field()
  last_name: string;

  @Prop({ unique: true, sparse: true })
  @Field({ nullable: true })
  email?: string;

  @Prop({ required: true, type: Date })
  @Field(() => GraphQLISODateTime)
  created_at: Date;

  @Prop({ type: Date })
  @Field(() => GraphQLISODateTime)
  updated_at: Date;

  @Prop({ type: Date })
  @Field(() => GraphQLISODateTime, { nullable: true })
  last_login_at?: Date;

  @Prop({ type: Number })
  @Field(() => Number, { nullable: true })
  lifetime_value?: number;

  @Prop({ type: Boolean })
  @Field(() => Boolean, { nullable: true })
  marketing_sms_opt_in?: boolean;

  @Prop({ type: Object })
  @Field(() => GraphQLJSON, { nullable: true })
  signup_source?: any;

  @Prop()
  @Field({nullable: true})
  last_ip: string;

  @Prop({ required: true, type: String, enum: Object.values(Role), default: Role.USER })
  @Field(() => String)
  role: Role;
}

export const UserSchema = SchemaFactory.createForClass(User);