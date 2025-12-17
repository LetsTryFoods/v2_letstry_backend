import { Injectable } from '@nestjs/common';
import * as winston from 'winston';
import * as path from 'path';

@Injectable()
export class OrderCartLoggerService {
  private logger: winston.Logger;

  constructor() {
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp({
          format: 'YYYY-MM-DD HH:mm:ss',
        }),
        winston.format.errors({ stack: true }),
        winston.format.splat(),
        winston.format.json(),
      ),
      defaultMeta: { service: 'order-cart-service' },
      transports: [
        new winston.transports.File({
          filename: path.join('logs', 'order-cart.log'),
          level: 'info',
        }),
        new winston.transports.File({
          filename: path.join('logs', 'order-cart-error.log'),
          level: 'error',
        }),
      ],
    });

    if (process.env.NODE_ENV !== 'production') {
      this.logger.add(
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple(),
          ),
        }),
      );
    }
  }

  logOrderCreationStart(paymentOrderId: string, cartId: string): void {
    this.logger.info('Order creation started', {
      event: 'ORDER_CREATION_START',
      paymentOrderId,
      cartId,
      timestamp: new Date().toISOString(),
    });
  }

  logOrderCreated(orderId: string, paymentOrderId: string, itemCount: number, totalAmount: string): void {
    this.logger.info('Order created successfully', {
      event: 'ORDER_CREATED',
      orderId,
      paymentOrderId,
      itemCount,
      totalAmount,
      timestamp: new Date().toISOString(),
    });
  }

  logCartClearStart(identityId: string, cartId: string): void {
    this.logger.info('Cart clearing started', {
      event: 'CART_CLEAR_START',
      identityId,
      cartId,
      timestamp: new Date().toISOString(),
    });
  }

  logCartCleared(identityId: string, itemsRemoved: number): void {
    this.logger.info('Cart cleared successfully', {
      event: 'CART_CLEARED',
      identityId,
      itemsRemoved,
      timestamp: new Date().toISOString(),
    });
  }

  logPaymentEventNotFound(paymentOrderId: string): void {
    this.logger.error('Payment event not found', {
      event: 'PAYMENT_EVENT_NOT_FOUND',
      paymentOrderId,
      timestamp: new Date().toISOString(),
    });
  }

  logCartNotFound(cartId: string): void {
    this.logger.error('Cart not found', {
      event: 'CART_NOT_FOUND',
      cartId,
      timestamp: new Date().toISOString(),
    });
  }

  logOrderCreationError(error: string, context: any): void {
    this.logger.error('Order creation failed', {
      event: 'ORDER_CREATION_ERROR',
      error,
      context,
      timestamp: new Date().toISOString(),
    });
  }

  logCartClearError(error: string, identityId: string): void {
    this.logger.error('Cart clearing failed', {
      event: 'CART_CLEAR_ERROR',
      error,
      identityId,
      timestamp: new Date().toISOString(),
    });
  }
}
