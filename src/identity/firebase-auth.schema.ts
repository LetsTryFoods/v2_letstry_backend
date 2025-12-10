import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ObjectType, Field, ID, GraphQLISODateTime } from '@nestjs/graphql';

export type FirebaseAuthDocument = FirebaseAuth & Document;

// Temporary schema for Firebase auth - will be updated for third-party OTP integration
@Schema()
@ObjectType()
export class FirebaseAuth {
  @Field(() => ID)
  _id: string;

  @Prop({ type: Types.ObjectId, required: true, unique: true, ref: 'User' })
  @Field()
  userId: string;

  @Prop({ required: true, unique: true, maxlength: 128 })
  @Field()
  firebaseUid: string;
}

export const FirebaseAuthSchema = SchemaFactory.createForClass(FirebaseAuth);