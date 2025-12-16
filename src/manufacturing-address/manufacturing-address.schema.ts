import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { ObjectType, Field, ID, GraphQLISODateTime } from '@nestjs/graphql';

export type ManufacturingAddressDocument = ManufacturingAddress & Document;

@Schema({ timestamps: true })
@ObjectType()
export class ManufacturingAddress {
  @Field(() => ID)
  _id: string;

  @Prop({ required: true, unique: true, index: true })
  @Field()
  batchCode: string;

  @Prop({ required: true })
  @Field()
  addressHeading: string;

  @Prop({ required: true })
  @Field()
  subAddressHeading: string;

  @Prop({ required: true })
  @Field()
  fssaiLicenseNumber: string;

  @Prop({ default: true })
  @Field()
  isActive: boolean;

  @Field(() => GraphQLISODateTime)
  createdAt: Date;

  @Field(() => GraphQLISODateTime)
  updatedAt: Date;
}

export const ManufacturingAddressSchema = SchemaFactory.createForClass(ManufacturingAddress);

// Create indexes for better query performance
ManufacturingAddressSchema.index({ batchCode: 1 });
ManufacturingAddressSchema.index({ isActive: 1 });
ManufacturingAddressSchema.index({ createdAt: -1 });
