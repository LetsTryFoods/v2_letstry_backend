import { Injectable, LoggerService } from '@nestjs/common';
import * as winston from 'winston';
import * as path from 'path';

@Injectable()
export class PaymentLoggerService implements LoggerService {
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
      defaultMeta: { service: 'payment-service' },
      transports: [
        new winston.transports.File({
          filename: path.join('logs', 'payment.log'),
          level: 'info',
        }),
        new winston.transports.File({
          filename: path.join('logs', 'payment-error.log'),
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

  log(message: string, context?: Record<string, any>) {
    this.logger.info(message, { context });
  }

  error(message: string, trace?: string, context?: Record<string, any>) {
    this.logger.error(message, { trace, context });
  }

  warn(message: string, context?: Record<string, any>) {
    this.logger.warn(message, { context });
  }

  debug(message: string, context?: Record<string, any>) {
    this.logger.debug(message, { context });
  }

  verbose(message: string, context?: Record<string, any>) {
    this.logger.verbose(message, { context });
  }

  logPaymentInitiation(data: {
    paymentOrderId: string;
    userId: string;
    amount: string;
    currency: string;
  }) {
    this.log('Payment Initiation', {
      event: 'PAYMENT_INITIATED',
      ...data,
    });
  }

  logPaymentExecution(data: {
    paymentOrderId: string;
    zaakpayOrderId: string;
    status: string;
  }) {
    this.log('Payment Execution', {
      event: 'PAYMENT_EXECUTED',
      ...data,
    });
  }

  logPaymentSuccess(data: {
    paymentOrderId: string;
    zaakpayTxnId: string;
    amount: string;
  }) {
    this.log('Payment Success', {
      event: 'PAYMENT_SUCCESS',
      ...data,
    });
  }

  logPaymentFailure(data: {
    paymentOrderId: string;
    reason: string;
    pspResponseCode?: string;
  }) {
    this.error('Payment Failure', undefined, {
      event: 'PAYMENT_FAILED',
      ...data,
    });
  }

  logRefundInitiation(data: {
    refundId: string;
    paymentOrderId: string;
    refundAmount: string;
  }) {
    this.log('Refund Initiation', {
      event: 'REFUND_INITIATED',
      ...data,
    });
  }

  logRefundSuccess(data: {
    refundId: string;
    zaakpayRefundId: string;
    amount: string;
  }) {
    this.log('Refund Success', {
      event: 'REFUND_SUCCESS',
      ...data,
    });
  }

  logRefundFailure(data: {
    refundId: string;
    reason: string;
    pspResponseCode?: string;
  }) {
    this.error('Refund Failure', undefined, {
      event: 'REFUND_FAILED',
      ...data,
    });
  }

  logWebhookReceived(data: {
    zaakpayOrderId: string;
    status: string;
    rawPayload: any;
  }) {
    this.log('Webhook Received', {
      event: 'WEBHOOK_RECEIVED',
      ...data,
    });
  }

  logReconciliation(data: {
    reconciliationId: string;
    totalDiscrepancies: number;
    date: string;
  }) {
    this.log('Reconciliation Process', {
      event: 'RECONCILIATION',
      ...data,
    });
  }

  logLedgerEntry(data: {
    transactionId: string;
    accountDebit: string;
    accountCredit: string;
    amount: string;
  }) {
    this.log('Ledger Entry Created', {
      event: 'LEDGER_ENTRY',
      ...data,
    });
  }

  logOrderCreated(data: {
    orderId: string;
    paymentOrderId: string;
    userId: string;
    amount: string;
  }) {
    this.log('Order Created', {
      event: 'ORDER_CREATED',
      ...data,
    });
  }

  logPSPRequest(data: {
    endpoint: string;
    method: string;
    payload: any;
  }) {
    this.log('PSP Request', {
      event: 'PSP_REQUEST',
      ...data,
    });
  }

  logPSPResponse(data: {
    endpoint: string;
    status: number;
    response: any;
  }) {
    this.log('PSP Response', {
      event: 'PSP_RESPONSE',
      ...data,
    });
  }

  logRetry(data: {
    paymentOrderId: string;
    retryCount: number;
    reason: string;
  }) {
    this.warn('Payment Retry', {
      event: 'PAYMENT_RETRY',
      ...data,
    });
  }
}
