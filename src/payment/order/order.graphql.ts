import { Field, ObjectType, InputType, registerEnumType, Int } from '@nestjs/graphql';
import { OrderStatus } from './order.schema';
import { PaginationMeta } from '../../common/pagination';

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
export class OrderUserInfo {
  @Field()
  identityId: string;

  @Field({ nullable: true })
  phoneNumber?: string;

  @Field({ nullable: true })
  email?: string;

  @Field({ nullable: true })
  firstName?: string;

  @Field({ nullable: true })
  lastName?: string;

  @Field()
  status: string;
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
export class OrderWithUserInfo extends OrderType {
  @Field(() => OrderUserInfo, { nullable: true })
  userInfo?: OrderUserInfo;
}

@ObjectType()
export class OrderStatusCount {
  @Field(() => Int)
  pending: number;

  @Field(() => Int)
  confirmed: number;

  @Field(() => Int)
  processing: number;

  @Field(() => Int)
  shipped: number;

  @Field(() => Int)
  delivered: number;

  @Field(() => Int)
  cancelled: number;

  @Field(() => Int)
  refunded: number;
}

@ObjectType()
export class OrdersSummary {
  @Field(() => Int)
  totalOrders: number;

  @Field(() => OrderStatusCount)
  statusCounts: OrderStatusCount;
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

@ObjectType()
export class AdminOrdersResponse {
  @Field(() => [OrderWithUserInfo])
  orders: OrderWithUserInfo[];

  @Field(() => PaginationMeta)
  meta: PaginationMeta;

  @Field(() => OrdersSummary)
  summary: OrdersSummary;
}
