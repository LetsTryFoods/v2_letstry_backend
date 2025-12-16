import { Field, ObjectType, InputType, registerEnumType } from '@nestjs/graphql';
import { OrderStatus } from './order.schema';

registerEnumType(OrderStatus, {
  name: 'OrderStatus',
});

@ObjectType()
export class OrderItemType {
  @Field()
  productId: string;

  @Field()
  quantity: number;

  @Field()
  price: string;

  @Field()
  totalPrice: string;

  @Field()
  name: string;

  @Field()
  sku: string;
}

@ObjectType()
export class OrderType {
  @Field()
  _id: string;

  @Field()
  orderId: string;

  @Field()
  identityId: string;

  @Field()
  paymentOrderId: string;

  @Field()
  cartId: string;

  @Field()
  totalAmount: string;

  @Field()
  currency: string;

  @Field(() => OrderStatus)
  orderStatus: OrderStatus;

  @Field({ nullable: true })
  shippingAddressId?: string;

  @Field(() => [OrderItemType])
  items: OrderItemType[];

  @Field({ nullable: true })
  deliveredAt?: Date;

  @Field({ nullable: true })
  cancelledAt?: Date;

  @Field({ nullable: true })
  trackingNumber?: string;

  @Field({ nullable: true })
  cancellationReason?: string;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}

@ObjectType()
export class PaginatedOrdersResponse {
  @Field(() => [OrderType])
  orders: OrderType[];

  @Field()
  total: number;

  @Field()
  page: number;

  @Field()
  limit: number;

  @Field()
  totalPages: number;
}
