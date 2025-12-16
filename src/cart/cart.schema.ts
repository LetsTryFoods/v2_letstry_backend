import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import {
  ObjectType,
  Field,
  ID,
  Float,
  Int,
  registerEnumType,
} from '@nestjs/graphql';
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
  productId: string;

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
  unitPrice: number;

  @Prop({ required: true })
  @Field(() => Float)
  totalPrice: number;

  @Prop({ required: true, default: 0 })
  @Field(() => Float)
  mrp: number;

  @Prop()
  @Field({ nullable: true })
  imageUrl?: string;

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
  discountAmount: number;

  @Field(() => Float)
  shippingCost: number;

  @Field(() => Float)
  estimatedTax: number;

  @Field(() => Float)
  handlingCharge: number;

  @Field(() => Float)
  grandTotal: number;
}

@Schema({ timestamps: true })
@ObjectType()
export class Cart {
  @Field(() => ID)
  _id: string;

  @Prop({ required: true })
  @Field()
  identityId: string;

  @Prop({ required: true, enum: CartStatus, default: CartStatus.ACTIVE })
  @Field(() => CartStatus)
  status: CartStatus;

  @Prop()
  @Field({ nullable: true })
  couponCode?: string;

  @Prop()
  @Field({ nullable: true })
  shippingMethodId?: string;

  @Prop({ type: Date })
  @Field({ nullable: true })
  expiresAt?: Date;

  @Prop({
    type: Object,
    default: {
      subtotal: 0,
      discountAmount: 0,
      shippingCost: 0,
      estimatedTax: 0,
      handlingCharge: 0,
      grandTotal: 0,
    },
  })
  @Field(() => CartTotals)
  totalsSummary: CartTotals;

  @Prop({ type: [CartItemSchema], default: [] })
  @Field(() => [CartItem])
  items: CartItem[];

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}

export const CartSchema = SchemaFactory.createForClass(Cart);

CartSchema.index({ identityId: 1 });
