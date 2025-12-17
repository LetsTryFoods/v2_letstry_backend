import { Injectable } from '@nestjs/common';
import * as winston from 'winston';
import * as path from 'path';

@Injectable()
export class WebhookLoggerService {
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
      defaultMeta: { service: 'webhook-service' },
      transports: [
        new winston.transports.File({
          filename: path.join('logs', 'webhook.log'),
          level: 'info',
        }),
        new winston.transports.File({
          filename: path.join('logs', 'webhook-error.log'),
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

  logWebhookReceived(data: any): void {
    this.logger.info('Webhook received', {
      event: 'WEBHOOK_RECEIVED',
      timestamp: new Date().toISOString(),
      data,
    });
  }

  logChecksumVerification(paymentOrderId: string, isValid: boolean): void {
    this.logger.info('Checksum verification', {
      event: 'CHECKSUM_VERIFICATION',
      paymentOrderId,
      isValid,
    });
  }

  logPaymentStatusUpdate(paymentOrderId: string, status: string, responseCode: string): void {
    this.logger.info('Payment status update', {
      event: 'PAYMENT_STATUS_UPDATE',
      paymentOrderId,
      status,
      responseCode,
    });
  }

  logEventEmission(paymentOrderId: string, status: string): void {
    this.logger.info('SSE event emitted', {
      event: 'SSE_EVENT_EMITTED',
      paymentOrderId,
      status,
    });
  }

  logWebhookError(error: string, context?: any): void {
    this.logger.error('Webhook processing error', {
      event: 'WEBHOOK_ERROR',
      error,
      context,
    });
  }
}
