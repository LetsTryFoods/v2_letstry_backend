import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { ObjectType, Field, Float } from '@nestjs/graphql';

export type ChargesDocument = Charges & Document;

@Schema({ collection: 'charges' })
@ObjectType()
export class Charges {
  @Field(() => String)
  _id: string;

  @Prop({ default: true })
  @Field()
  active: boolean;

  @Prop({ required: true, default: 0 })
  @Field(() => Float)
  handlingCharge: number;

  @Prop({ required: true, default: 0 })
  @Field(() => Float)
  gstPercentage: number;

  @Prop({ required: true, default: 0 })
  @Field(() => Float)
  freeDeliveryThreshold: number;

  @Prop({ required: true, default: 0 })
  @Field(() => Float)
  deliveryDelhiBelowThreshold: number;

  @Prop({ required: true, default: 0 })
  @Field(() => Float)
  deliveryRestBelowThreshold: number;
}

export const ChargesSchema = SchemaFactory.createForClass(Charges);
