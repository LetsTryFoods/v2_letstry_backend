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
  firstName: string;

  @Prop()
  @Field()
  lastName: string;

  @Prop({ unique: true, sparse: true })
  @Field({ nullable: true })
  email?: string;

  @Prop({ type: Date, default: Date.now })
  @Field(() => GraphQLISODateTime)
  createdAt: Date;

  @Prop({ type: Date, default: Date.now })
  @Field(() => GraphQLISODateTime)
  updatedAt: Date;

  @Prop({ type: Date })
  @Field(() => GraphQLISODateTime, { nullable: true })
  lastLoginAt?: Date;

  @Prop({ type: Number })
  @Field(() => Number, { nullable: true })
  lifetimeValue?: number;

  @Prop({ type: Boolean })
  @Field(() => Boolean, { nullable: true })
  marketingSmsOptIn?: boolean;

  @Prop({ type: Object })
  @Field(() => GraphQLJSON, { nullable: true })
  signupSource?: any;

  @Prop()
  @Field({nullable: true})
  lastIp: string;

  @Prop({ type: String, enum: Object.values(Role), default: Role.USER })
  @Field(() => String)
  role: Role;

  @Prop({ default: false })
  @Field(() => Boolean)
  isPhoneVerified: boolean;

  @Prop({ type: [String], default: [] })
  @Field(() => [String])
  mergedGuestIds: string[];
}

export const UserSchema = SchemaFactory.createForClass(User);