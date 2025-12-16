import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { ObjectType, Field, ID, GraphQLISODateTime, Float } from '@nestjs/graphql';

export type AddressDocument = Address & Document;

@Schema({ timestamps: true })
@ObjectType()
export class Address {
  @Field(() => ID)
  _id: string;

  @Prop({ required: true, index: true })
  @Field(() => ID)
  identityId: string;

  @Prop({ required: true })
  @Field()
  addressType: string;

  @Prop({ required: true })
  @Field()
  recipientPhone: string;

  @Prop({ required: true })
  @Field()
  recipientName: string;

  @Prop({ required: true })
  @Field()
  buildingName: string;

  @Prop()
  @Field({ nullable: true })
  floor?: string;

  @Prop()
  @Field({ nullable: true })
  streetArea?: string;

  @Prop()
  @Field({ nullable: true })
  landmark?: string;

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

  @Prop({ default: false })
  @Field()
  isDefault: boolean;

  @Prop({ required: true })
  @Field(() => Float)
  latitude: number;

  @Prop({ required: true })
  @Field(() => Float)
  longitude: number;

  @Prop({ required: true })
  @Field()
  formattedAddress: string;

  @Prop()
  @Field({ nullable: true })
  placeId?: string;

  @Field(() => GraphQLISODateTime)
  createdAt: Date;

  @Field(() => GraphQLISODateTime)
  updatedAt: Date;
}

export const AddressSchema = SchemaFactory.createForClass(Address);
