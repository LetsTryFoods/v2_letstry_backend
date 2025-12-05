import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { ObjectType, Field, ID, Float, Int, registerEnumType } from '@nestjs/graphql';
import GraphQLJSON from 'graphql-type-json';

export type CartDocument = Cart & Document;

export enum CartStatus {
  ACTIVE = 'ACTIVE',
  ORDERED = 'ORDERED',
  EXPIRED = 'EXPIRED',
  MERGED = 'MERGED',
}

registerEnumType(CartStatus, {
  name: 'CartStatus',
});

@Schema()
@ObjectType()
export class CartItem {
  @Prop({ required: true })
  @Field(() => ID)
  product_id: string;

  @Prop({ required: true })
  @Field()
  sku: string;

  @Prop({ required: true })
  @Field()
  name: string;

  @Prop({ required: true })
  @Field(() => Int)
  quantity: number;

  @Prop({ required: true })
  @Field(() => Float)
  unit_price: number;

  @Prop({ required: true })
  @Field(() => Float)
  total_price: number;

  @Prop({ required: true, default: 0 })
  @Field(() => Float)
  mrp: number;

  @Prop()
  @Field({ nullable: true })
  image_url?: string;

  @Prop({ type: Object })
  @Field(() => GraphQLJSON, { nullable: true })
  attributes?: any;
}

export const CartItemSchema = SchemaFactory.createForClass(CartItem);

@ObjectType()
export class CartTotals {
  @Field(() => Float)
  subtotal: number;

  @Field(() => Float)
  discount_amount: number;

  @Field(() => Float)
  shipping_cost: number;

  @Field(() => Float)
  estimated_tax: number;

  @Field(() => Float)
  grand_total: number;
}

@Schema({ timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } })
@ObjectType()
export class Cart {
  @Field(() => ID)
  _id: string;

  @Prop({ index: true })
  @Field({ nullable: true })
  user_id?: string;

  @Prop({ index: true })
  @Field({ nullable: true })
  session_id?: string;

  @Prop({ required: true, enum: CartStatus, default: CartStatus.ACTIVE })
  @Field(() => CartStatus)
  status: CartStatus;

  @Prop()
  @Field({ nullable: true })
  coupon_code?: string;

  @Prop()
  @Field({ nullable: true })
  shipping_method_id?: string;

  @Prop({ type: Date })
  @Field({ nullable: true })
  expires_at?: Date;

  @Prop({ type: Object, default: { subtotal: 0, discount_amount: 0, shipping_cost: 0, estimated_tax: 0, grand_total: 0 } })
  @Field(() => CartTotals)
  totals_summary: CartTotals;

  @Prop({ type: [CartItemSchema], default: [] })
  @Field(() => [CartItem])
  items: CartItem[];

  @Field()
  created_at: Date;

  @Field()
  updated_at: Date;
}

export const CartSchema = SchemaFactory.createForClass(Cart);
