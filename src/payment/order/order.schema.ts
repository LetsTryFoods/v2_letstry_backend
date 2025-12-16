import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum OrderStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  PROCESSING = 'PROCESSING',
  SHIPPED = 'SHIPPED',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED',
}

@Schema({ timestamps: true })
export class Order extends Document {
  @Prop({ required: true, unique: true })
  orderId: string;

  @Prop({ required: true, type: Types.ObjectId, ref: 'Identity' })
  identityId: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'PaymentOrder' })
  paymentOrderId: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'Cart' })
  cartId: Types.ObjectId;

  @Prop({ required: true })
  totalAmount: string;

  @Prop({ required: true })
  currency: string;

  @Prop({ required: true, type: String, enum: OrderStatus, default: OrderStatus.PENDING })
  orderStatus: OrderStatus;

  @Prop({ type: Types.ObjectId, ref: 'Address' })
  shippingAddressId: Types.ObjectId;

  @Prop({ type: Array })
  items: Array<{
    productId: Types.ObjectId;
    quantity: number;
    price: string;
    totalPrice: string;
    name: string;
    sku: string;
  }>;

  @Prop({ type: Date })
  deliveredAt: Date;

  @Prop({ type: Date })
  cancelledAt: Date;

  @Prop()
  trackingNumber: string;

  @Prop()
  cancellationReason: string;

  @Prop({ type: Object })
  metadata: Record<string, any>;

  createdAt: Date;
  updatedAt: Date;
}

export const OrderSchema = SchemaFactory.createForClass(Order);

OrderSchema.index({ orderId: 1 }, { unique: true });
OrderSchema.index({ identityId: 1 });
OrderSchema.index({ paymentOrderId: 1 });
OrderSchema.index({ orderStatus: 1 });
OrderSchema.index({ createdAt: -1 });
