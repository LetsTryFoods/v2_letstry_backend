import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Order, OrderStatus } from './order.schema';
import { PaymentLoggerService } from '../payment-logger.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class OrderService {
  constructor(
    @InjectModel(Order.name) private orderModel: Model<Order>,
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
