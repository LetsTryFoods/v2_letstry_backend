import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ObjectType, Field, ID, GraphQLISODateTime } from '@nestjs/graphql';

export type AddressDocument = Address & Document;

@Schema({ timestamps: true })
@ObjectType()
export class Address {
  @Field(() => ID)
  _id: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  @Field(() => ID)
  userId: string;

  @Prop({ required: true })
  @Field()
  name: string;

  @Prop({ required: true })
  @Field()
  streetAddress: string;

  @Prop()
  @Field({ nullable: true })
  extendedAddress?: string;

  @Prop({ required: true })
  @Field()
  addressLocality: string;

  @Prop({ required: true })
  @Field()
  addressRegion: string;

  @Prop({ required: true })
  @Field()
  postalCode: string;

  @Prop({ required: true })
  @Field()
  addressCountry: string;

  @Prop({ required: true })
  @Field()
  telephone: string;

  @Prop({ default: false })
  @Field()
  isDefault: boolean;

  @Field(() => GraphQLISODateTime)
  createdAt: Date;

  @Field(() => GraphQLISODateTime)
  updatedAt: Date;
}

export const AddressSchema = SchemaFactory.createForClass(Address);
