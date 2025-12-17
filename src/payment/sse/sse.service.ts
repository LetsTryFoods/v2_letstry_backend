import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import type { Response } from 'express';
import { SseLoggerService } from './sse-logger.service';

interface SseConnection {
  response: Response;
  paymentOrderId: string;
  connectedAt: Date;
}

@Injectable()
export class SseService {
  private readonly logger = new Logger(SseService.name);
  private connections = new Map<string, SseConnection[]>();

  constructor(private readonly sseLogger: SseLoggerService) {}

  addConnection(paymentOrderId: string, response: Response): void {
    const connection: SseConnection = {
      response,
      paymentOrderId,
      connectedAt: new Date(),
    };

    const existing = this.connections.get(paymentOrderId) || [];
    existing.push(connection);
    this.connections.set(paymentOrderId, existing);

    this.logger.log(`SSE connection added for payment ${paymentOrderId}`);
    this.sseLogger.logConnectionEstablished(paymentOrderId);

    response.on('close', () => {
      this.removeConnection(paymentOrderId, response);
    });
  }

  @OnEvent('payment.status.updated')
  handlePaymentStatusUpdate(payload: {
    paymentOrderId: string;
    status: string;
    message?: string;
  }): void {
    this.logger.log(`Payment status event received: ${payload.paymentOrderId} - ${payload.status}`);
    this.sseLogger.logEventReceived(payload.paymentOrderId, payload.status);
    this.sendEventToClients(payload.paymentOrderId, payload);
  }

  private sendEventToClients(paymentOrderId: string, data: any): void {
    const connections = this.connections.get(paymentOrderId);

    if (!connections || connections.length === 0) {
      this.logger.warn(`No SSE connections found for payment ${paymentOrderId}`);
      return;
    }

    connections.forEach((conn) => {
      try {
        conn.response.write(`data: ${JSON.stringify(data)}\n\n`);
        this.logger.log(`SSE event sent to client for payment ${paymentOrderId}`);
        this.sseLogger.logEventSent(paymentOrderId, data);

        if (this.isFinalStatus(data.status)) {
          conn.response.end();
          this.logger.log(`SSE connection closed for payment ${paymentOrderId} (final status)`);
          this.sseLogger.logConnectionClosed(paymentOrderId, `Final status: ${data.status}`);
        }
      } catch (error) {
        this.logger.error(`Failed to send SSE event: ${error.message}`);
        this.sseLogger.logError('Failed to send SSE event', error, paymentOrderId);
        this.removeConnection(paymentOrderId, conn.response);
      }
    });

    if (this.isFinalStatus(data.status)) {
      this.connections.delete(paymentOrderId);
    }
  }

  private removeConnection(paymentOrderId: string, response: Response): void {
    const connections = this.connections.get(paymentOrderId);
    if (!connections) return;

    const filtered = connections.filter((conn) => conn.response !== response);

    if (filtered.length === 0) {
      this.connections.delete(paymentOrderId);
    } else {
      this.connections.set(paymentOrderId, filtered);
    }

    this.logger.log(`SSE connection removed for payment ${paymentOrderId}`);
    this.sseLogger.logConnectionClosed(paymentOrderId, 'Client disconnected');
  }

  private isFinalStatus(status: string): boolean {
    return ['SUCCESS', 'FAILED', 'CANCELLED'].includes(status);
  }

  getActiveConnectionsCount(): number {
    let count = 0;
    this.connections.forEach((conns) => {
      count += conns.length;
    });
    return count;
  }
}
