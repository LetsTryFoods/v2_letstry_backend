import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PaymentExecutorService } from './payment-executor.service';
import { ZaakpayService } from './zaakpay.service';
import { PaymentLoggerService } from './payment-logger.service';
import { WebhookLoggerService } from './webhook-logger.service';
import { Public } from '../common/decorators/public.decorator';

@Controller('payment')
export class PaymentController {
  constructor(
    private readonly paymentExecutorService: PaymentExecutorService,
    private readonly zaakpayService: ZaakpayService,
    private readonly paymentLogger: PaymentLoggerService,
    private readonly eventEmitter: EventEmitter2,
    private readonly webhookLogger: WebhookLoggerService,
  ) {}

  @Post('webhook')
  @Public()
  @HttpCode(HttpStatus.OK)
  async handleWebhook(@Body() body: any): Promise<string> {
    try {
      this.paymentLogger.logWebhookReceived(body);
      this.webhookLogger.logWebhookReceived(body);

      const checksumValid = this.zaakpayService.verifyChecksum(
        body.txnData,
        body.checksum,
      );

      this.webhookLogger.logChecksumVerification(body.txnData, checksumValid);

      if (!checksumValid) {
        this.paymentLogger.error('Webhook checksum verification failed', '', body);
        this.webhookLogger.logWebhookError('Checksum verification failed', body);
        return 'FAILURE';
      }

      const txnData = this.parseTxnData(body.txnData);

      const paymentOrderId = txnData.orderId;
      const responseCode = txnData.responseCode;

      this.webhookLogger.logPaymentStatusUpdate(paymentOrderId, txnData.status, responseCode);

      if (responseCode === '100') {
        await this.paymentExecutorService.handlePaymentSuccess({
          paymentOrderId,
          zaakpayTxnId: txnData.txnId,
          paymentMethod: this.mapPaymentMethod(txnData.paymentMethod),
          bankTxnId: txnData.bankTransactionId,
          cardType: txnData.cardType,
          cardNumber: txnData.cardNumber,
          pspRawResponse: txnData,
        });
        this.emitPaymentStatusEvent(paymentOrderId, 'SUCCESS', 'Payment completed successfully');
      } else if (responseCode === '200' || responseCode === '300') {
        await this.paymentExecutorService.handlePaymentPending({
          paymentOrderId,
          pspResponseMessage: txnData.responseDescription,
        });
        this.emitPaymentStatusEvent(paymentOrderId, 'PENDING', txnData.responseDescription);
      } else {
        await this.paymentExecutorService.handlePaymentFailure({
          paymentOrderId,
          failureReason: txnData.responseDescription || 'Payment failed',
          pspResponseCode: responseCode,
          pspResponseMessage: txnData.responseDescription,
          pspRawResponse: txnData,
        });
        this.emitPaymentStatusEvent(paymentOrderId, 'FAILED', txnData.responseDescription || 'Payment failed');
      }

      return 'SUCCESS';
    } catch (error) {
      this.paymentLogger.error('Webhook processing error', error.stack, {
        error: error.message,
        body,
      });
      this.webhookLogger.logWebhookError(error.message, { stack: error.stack, body });
      return 'FAILURE';
    }
  }

  private parseTxnData(txnDataString: string): any {
    try {
      const parsed = JSON.parse(txnDataString);
      
      if (parsed.txns && parsed.txns.length > 0) {
        const txn = parsed.txns[0];
        return {
          orderId: txn.orderId,
          responseCode: txn.responseCode,
          responseDescription: txn.responseDescription,
          txnId: txn.pgTransId,
          paymentMethod: txn.paymentMode,
          bankTxnId: txn.bankRefNum,
          cardType: txn.cardScheme,
          cardNumber: txn.cardToken,
          amount: txn.amount,
          status: txn.responseCode === '100' ? 'SUCCESS' : 'FAILED',
        };
      }
      
      throw new Error('No transactions found in webhook data');
    } catch (error) {
      this.webhookLogger.logWebhookError('Failed to parse txnData', { error: error.message, txnDataString });
      throw error;
    }
  }

  private mapPaymentMethod(method: string): string {
    const methodMap: { [key: string]: string } = {
      'CC': 'CREDIT_CARD',
      'DC': 'DEBIT_CARD',
      'NB': 'NET_BANKING',
      'UPI': 'UPI',
      'WALLET': 'WALLET',
    };
    
    return methodMap[method] || 'CREDIT_CARD';
  }

  private emitPaymentStatusEvent(paymentOrderId: string, status: string, message?: string): void {
    this.eventEmitter.emit('payment.status.updated', {
      paymentOrderId,
      status,
      message,
    });
    this.paymentLogger.log('Payment status event emitted', {
      paymentOrderId,
      status,
    });
    this.webhookLogger.logEventEmission(paymentOrderId, status);
  }
}
