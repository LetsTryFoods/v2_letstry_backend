import { Injectable } from '@nestjs/common';
import * as winston from 'winston';
import * as path from 'path';

@Injectable()
export class SseLoggerService {
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
      defaultMeta: { service: 'sse-service' },
      transports: [
        new winston.transports.File({
          filename: path.join('logs', 'sse.log'),
          level: 'info',
        }),
        new winston.transports.File({
          filename: path.join('logs', 'sse-error.log'),
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

  logConnectionEstablished(paymentOrderId: string): void {
    this.logger.info('SSE connection established', {
      event: 'SSE_CONNECTION_ESTABLISHED',
      paymentOrderId,
      timestamp: new Date().toISOString(),
    });
  }

  logConnectionClosed(paymentOrderId: string, reason: string): void {
    this.logger.info('SSE connection closed', {
      event: 'SSE_CONNECTION_CLOSED',
      paymentOrderId,
      reason,
    });
  }

  logEventSent(paymentOrderId: string, eventData: any): void {
    this.logger.info('SSE event sent to client', {
      event: 'SSE_EVENT_SENT',
      paymentOrderId,
      eventData,
    });
  }

  logEventReceived(paymentOrderId: string, status: string): void {
    this.logger.info('Payment status event received', {
      event: 'SSE_EVENT_RECEIVED',
      paymentOrderId,
      status,
    });
  }

  logConnectionTimeout(paymentOrderId: string): void {
    this.logger.warn('SSE connection timeout', {
      event: 'SSE_CONNECTION_TIMEOUT',
      paymentOrderId,
    });
  }

  logError(message: string, error: any, paymentOrderId?: string): void {
    this.logger.error(message, {
      event: 'SSE_ERROR',
      paymentOrderId,
      error: error.message || error,
      stack: error.stack,
    });
  }

  logActiveConnections(count: number): void {
    this.logger.info('Active SSE connections', {
      event: 'SSE_ACTIVE_CONNECTIONS',
      count,
    });
  }
}
