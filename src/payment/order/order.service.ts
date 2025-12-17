import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Order, OrderStatus } from './order.schema';
import { PaymentLoggerService } from '../payment-logger.service';
import { v4 as uuidv4 } from 'uuid';
import { GetAllOrdersInput } from './order.input';
import { AdminOrdersResponse, OrderWithUserInfo, OrdersSummary, OrderStatusCount, OrderUserInfo } from './order.graphql';
import { PaginationMeta } from '../../common/pagination';
import { Identity, IdentityDocument } from '../../common/schemas/identity.schema';

@Injectable()
export class OrderService {
  constructor(
    @InjectModel(Order.name) private orderModel: Model<Order>,
    @InjectModel(Identity.name) private identityModel: Model<IdentityDocument>,
    private paymentLogger: PaymentLoggerService,
  ) {}

  async createOrder(params: {
    identityId: string;
    paymentOrderId: string;
    cartId: string;
    totalAmount: string;
    currency: string;
    shippingAddressId?: string;
    items: Array<{
      productId: string;
      quantity: number;
      price: string;
      totalPrice: string;
      name: string;
      sku: string;
    }>;
  }): Promise<Order> {
    const orderId = `ORD_${Date.now()}_${uuidv4().substring(0, 8)}`;

    const order = new this.orderModel({
      orderId,
      identityId: params.identityId,
      paymentOrderId: params.paymentOrderId,
      cartId: params.cartId,
      totalAmount: params.totalAmount,
      currency: params.currency,
      orderStatus: OrderStatus.PENDING,
      shippingAddressId: params.shippingAddressId,
      items: params.items,
    });

    const savedOrder = await order.save();

    this.paymentLogger.logOrderCreated({
      orderId,
      paymentOrderId: params.paymentOrderId,
      userId: params.identityId,
      amount: params.totalAmount,
    });

    return savedOrder;
  }

  async getOrderById(orderId: string): Promise<Order> {
    const order = await this.orderModel.findOne({ orderId }).exec();

    if (!order) {
      throw new Error('Order not found');
    }

    return order;
  }

  async getOrdersByIdentity(params: {
    identityId: string;
    mergedGuestIds?: string[];
    page?: number;
    limit?: number;
    status?: OrderStatus;
  }): Promise<{ orders: Order[]; total: number; page: number; limit: number; totalPages: number }> {
    const page = params.page || 1;
    const limit = params.limit || 10;
    const skip = (page - 1) * limit;

    const allIdentityIds = [
      params.identityId,
      ...(params.mergedGuestIds || []),
    ];

    const query: any = {
      identityId: { $in: allIdentityIds },
    };

    if (params.status) {
      query.orderStatus = params.status;
    }

    const [orders, total] = await Promise.all([
      this.orderModel
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.orderModel.countDocuments(query).exec(),
    ]);

    return {
      orders,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getAllOrdersForAdmin(input: GetAllOrdersInput): Promise<AdminOrdersResponse> {
    const filter = this.buildAdminOrderFilter(input);
    const page = input.page || 1;
    const limit = input.limit || 10;
    const skip = (page - 1) * limit;

    const [orders, totalCount, summary] = await Promise.all([
      this.fetchOrdersWithPagination(filter, skip, limit),
      this.countOrders(filter),
      this.getOrdersSummary(),
    ]);

    const ordersWithUserInfo = await this.enrichOrdersWithUserInfo(orders);
    const meta = this.buildPaginationMeta(totalCount, page, limit);

    return { orders: ordersWithUserInfo, meta, summary };
  }

  private buildAdminOrderFilter(input: GetAllOrdersInput): any {
    const filter: any = {};

    const defaultStartDate = new Date();
    defaultStartDate.setDate(defaultStartDate.getDate() - 2);
    defaultStartDate.setHours(0, 0, 0, 0);

    const startDate = input.startDate || defaultStartDate;
    const endDate = input.endDate || new Date();

    filter.createdAt = {
      $gte: startDate,
      $lte: endDate,
    };

    if (input.status) {
      filter.orderStatus = input.status;
    }

    return filter;
  }

  private async fetchOrdersWithPagination(filter: any, skip: number, limit: number): Promise<Order[]> {
    return this.orderModel
      .find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec();
  }

  private async countOrders(filter: any): Promise<number> {
    return this.orderModel.countDocuments(filter).exec();
  }

  private async enrichOrdersWithUserInfo(orders: Order[]): Promise<OrderWithUserInfo[]> {
    const identityIds = [...new Set(orders.map(order => order.identityId.toString()))];
    const identities = await this.fetchIdentitiesByIds(identityIds);
    const identityMap = this.createIdentityMap(identities);

    return orders.map(order => this.mapOrderWithUserInfo(order, identityMap));
  }

  private async fetchIdentitiesByIds(identityIds: string[]): Promise<IdentityDocument[]> {
    return this.identityModel.find({ _id: { $in: identityIds } }).exec();
  }

  private createIdentityMap(identities: IdentityDocument[]): Map<string, IdentityDocument> {
    return new Map(identities.map(identity => [identity._id.toString(), identity]));
  }

  private mapOrderWithUserInfo(order: Order, identityMap: Map<string, IdentityDocument>): OrderWithUserInfo {
    const identity = identityMap.get(order.identityId.toString());
    const orderObj = order.toObject ? order.toObject() : order;

    return {
      ...orderObj,
      userInfo: identity ? this.mapToOrderUserInfo(identity) : undefined,
    };
  }

  private mapToOrderUserInfo(identity: IdentityDocument): OrderUserInfo {
    return {
      identityId: identity._id.toString(),
      phoneNumber: identity.phoneNumber,
      email: identity.email,
      firstName: identity.firstName,
      lastName: identity.lastName,
      status: identity.status,
    };
  }

  private async getOrdersSummary(): Promise<OrdersSummary> {
    const [totalOrders, statusCounts] = await Promise.all([
      this.orderModel.countDocuments().exec(),
      this.getStatusCounts(),
    ]);

    return { totalOrders, statusCounts };
  }

  private async getStatusCounts(): Promise<OrderStatusCount> {
    const [pending, confirmed, processing, shipped, delivered, cancelled, refunded] = await Promise.all([
      this.countByStatus(OrderStatus.PENDING),
      this.countByStatus(OrderStatus.CONFIRMED),
      this.countByStatus(OrderStatus.PROCESSING),
      this.countByStatus(OrderStatus.SHIPPED),
      this.countByStatus(OrderStatus.DELIVERED),
      this.countByStatus(OrderStatus.CANCELLED),
      this.countByStatus(OrderStatus.REFUNDED),
    ]);

    return { pending, confirmed, processing, shipped, delivered, cancelled, refunded };
  }

  private async countByStatus(status: OrderStatus): Promise<number> {
    return this.orderModel.countDocuments({ orderStatus: status }).exec();
  }

  private buildPaginationMeta(totalCount: number, page: number, limit: number): PaginationMeta {
    const totalPages = Math.ceil(totalCount / limit);

    return {
      totalCount,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    };
  }

  async updateOrderStatus(params: {
    orderId: string;
    status: OrderStatus;
    trackingNumber?: string;
  }): Promise<Order> {
    const updateData: any = {
      orderStatus: params.status,
    };

    if (params.trackingNumber) {
      updateData.trackingNumber = params.trackingNumber;
    }

    if (params.status === OrderStatus.DELIVERED) {
      updateData.deliveredAt = new Date();
    }

    if (params.status === OrderStatus.CANCELLED) {
      updateData.cancelledAt = new Date();
    }

    const order = await this.orderModel
      .findOneAndUpdate({ orderId: params.orderId }, updateData, { new: true })
      .exec();

    if (!order) {
      throw new Error('Order not found');
    }

    this.paymentLogger.log('Order status updated', {
      orderId: params.orderId,
      oldStatus: order.orderStatus,
      newStatus: params.status,
    });

    return order;
  }

  async cancelOrder(params: {
    orderId: string;
    reason: string;
  }): Promise<Order> {
    const order = await this.orderModel.findOne({ orderId: params.orderId });

    if (!order) {
      throw new Error('Order not found');
    }

    if (
      order.orderStatus === OrderStatus.DELIVERED ||
      order.orderStatus === OrderStatus.CANCELLED
    ) {
      throw new Error(`Cannot cancel order with status: ${order.orderStatus}`);
    }

    const updatedOrder = await this.orderModel
      .findOneAndUpdate(
        { orderId: params.orderId },
        {
          orderStatus: OrderStatus.CANCELLED,
          cancelledAt: new Date(),
          cancellationReason: params.reason,
        },
        { new: true },
      )
      .exec();

    if (!updatedOrder) {
      throw new Error('Failed to cancel order');
    }

    this.paymentLogger.log('Order cancelled', {
      orderId: params.orderId,
      reason: params.reason,
    });

    return updatedOrder;
  }

  async getOrderByPaymentOrderId(paymentOrderId: string): Promise<Order | null> {
    return this.orderModel.findOne({ paymentOrderId }).exec();
  }
}
