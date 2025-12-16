import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import {
  ObjectType,
  Field,
  ID,
  GraphQLISODateTime,
  registerEnumType,
} from '@nestjs/graphql';
import GraphQLJSON from 'graphql-type-json';

export type IdentityDocument = Identity & Document;

export enum IdentityStatus {
  GUEST = 'guest',
  REGISTERED = 'registered',
  VERIFIED = 'verified',
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  MERGED = 'merged',
}

registerEnumType(IdentityStatus, {
  name: 'IdentityStatus',
});

@Schema({ timestamps: true })
@ObjectType()
export class Identity {
  @Field(() => ID)
  _id: string;

  @Prop({ required: true })
  @Field()
  identityId: string;

  @Prop({
    type: String,
    enum: Object.values(IdentityStatus),
    default: IdentityStatus.GUEST,
  })
  @Field(() => IdentityStatus)
  status: IdentityStatus;

  @Prop({ sparse: true })
  @Field({ nullable: true })
  phoneNumber?: string;

  @Prop()
  @Field({ nullable: true })
  firstName?: string;

  @Prop()
  @Field({ nullable: true })
  lastName?: string;

  @Prop({ sparse: true })
  @Field({ nullable: true })
  email?: string;

  @Prop({ default: false })
  @Field()
  isPhoneVerified: boolean;

  @Prop({ default: false })
  @Field()
  isEmailVerified: boolean;

  @Prop()
  @Field({ nullable: true })
  firebaseUid?: string;

  @Prop({ type: [String], default: [] })
  @Field(() => [String])
  sessionIds: string[];

  @Prop()
  @Field({ nullable: true })
  currentSessionId?: string;

  @Prop({ type: Date })
  @Field(() => GraphQLISODateTime, { nullable: true })
  lastLoginAt?: Date;

  @Prop({ type: Date })
  @Field(() => GraphQLISODateTime, { nullable: true })
  registeredAt?: Date;

  @Prop({ type: Date })
  @Field(() => GraphQLISODateTime, { nullable: true })
  lastActiveAt?: Date;

  @Prop({ type: Number, default: 0 })
  @Field(() => Number)
  lifetimeValue: number;

  @Prop({ type: Boolean })
  @Field({ nullable: true })
  marketingSmsOptIn?: boolean;

  @Prop({ type: Object })
  @Field(() => GraphQLJSON, { nullable: true })
  signupSource?: any;

  @Prop()
  @Field({ nullable: true })
  ipAddress?: string;

  @Prop({ type: Object })
  @Field(() => GraphQLJSON, { nullable: true })
  deviceInfo?: any;

  @Prop()
  @Field({ nullable: true })
  lastIp?: string;

  @Prop({ type: String, default: 'user' })
  @Field()
  role: string;

  @Prop({ type: [String], default: [] })
  @Field(() => [String])
  mergedGuestIds: string[];

  @Field(() => GraphQLISODateTime)
  createdAt: Date;

  @Field(() => GraphQLISODateTime)
  updatedAt: Date;
}

export const IdentitySchema = SchemaFactory.createForClass(Identity);

IdentitySchema.index({ identityId: 1 }, { unique: true });
IdentitySchema.index({ phoneNumber: 1 }, { unique: true, sparse: true });
IdentitySchema.index({ currentSessionId: 1 });
IdentitySchema.index({ sessionIds: 1 });
IdentitySchema.index({ status: 1 });
IdentitySchema.index({ email: 1 }, { unique: true, sparse: true });
