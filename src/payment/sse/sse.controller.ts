import { Controller, Get, Param, Res, Logger } from '@nestjs/common';
import type { Response } from 'express';
import { SseService } from './sse.service';
import { Public } from '../../common/decorators/public.decorator';

@Controller('payment/status')
export class SseController {
  private readonly logger = new Logger(SseController.name);

  constructor(private readonly sseService: SseService) {}

  @Get(':paymentOrderId/stream')
  @Public()
  streamPaymentStatus(
    @Param('paymentOrderId') paymentOrderId: string,
    @Res() response: Response,
  ): void {
    this.logger.log(`SSE connection requested for payment ${paymentOrderId}`);

    this.setupSseHeaders(response);
    this.sseService.addConnection(paymentOrderId, response);
    this.sendInitialMessage(response, paymentOrderId);
    this.setupTimeout(response, paymentOrderId);
  }

  private setupSseHeaders(response: Response): void {
    response.setHeader('Content-Type', 'text/event-stream');
    response.setHeader('Cache-Control', 'no-cache');
    response.setHeader('Connection', 'keep-alive');
    response.setHeader('X-Accel-Buffering', 'no');
  }

  private sendInitialMessage(response: Response, paymentOrderId: string): void {
    response.write(`data: ${JSON.stringify({ 
      type: 'connected', 
      paymentOrderId,
      message: 'SSE connection established' 
    })}\n\n`);
  }

  private setupTimeout(response: Response, paymentOrderId: string): void {
    const timeout = setTimeout(() => {
      this.logger.log(`SSE connection timeout for payment ${paymentOrderId}`);
      response.write(`data: ${JSON.stringify({ 
        type: 'timeout', 
        message: 'Connection timeout' 
      })}\n\n`);
      response.end();
    }, 15 * 60 * 1000);

    response.on('close', () => {
      clearTimeout(timeout);
    });
  }
}
