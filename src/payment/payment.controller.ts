import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { PaymentExecutorService } from './payment-executor.service';
import { ZaakpayService } from './zaakpay.service';
import { PaymentLoggerService } from './payment-logger.service';
import { Public } from '../common/decorators/public.decorator';

@Controller('payment')
export class PaymentController {
  constructor(
    private readonly paymentExecutorService: PaymentExecutorService,
    private readonly zaakpayService: ZaakpayService,
    private readonly paymentLogger: PaymentLoggerService,
  ) {}

  @Post('webhook')
  @Public()
  @HttpCode(HttpStatus.OK)
  async handleWebhook(@Body() body: any): Promise<string> {
    try {
      this.paymentLogger.logWebhookReceived(body);

      const checksumValid = this.zaakpayService.verifyChecksum(
        body.txnData,
        body.checksum,
      );

      if (!checksumValid) {
        this.paymentLogger.error('Webhook checksum verification failed', '', body);
        return 'FAILURE';
      }

      const txnData = this.parseTxnData(body.txnData);

      const paymentOrderId = txnData.orderId;
      const responseCode = txnData.responseCode;

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
      } else if (responseCode === '200' || responseCode === '300') {
        await this.paymentExecutorService.handlePaymentPending({
          paymentOrderId,
          pspResponseMessage: txnData.responseDescription,
        });
      } else {
        await this.paymentExecutorService.handlePaymentFailure({
          paymentOrderId,
          failureReason: txnData.responseDescription || 'Payment failed',
          pspResponseCode: responseCode,
          pspResponseMessage: txnData.responseDescription,
          pspRawResponse: txnData,
        });
      }

      return 'SUCCESS';
    } catch (error) {
      this.paymentLogger.error('Webhook processing error', error.stack, {
        error: error.message,
        body,
      });
      return 'FAILURE';
    }
  }

  private parseTxnData(txnDataString: string): any {
    const params: any = {};
    const pairs = txnDataString.split('&');
    
    for (const pair of pairs) {
      const [key, value] = pair.split('=');
      params[key] = decodeURIComponent(value || '');
    }
    
    return params;
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
}
