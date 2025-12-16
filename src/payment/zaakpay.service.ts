import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import axios from 'axios';
import { PaymentLoggerService } from './payment-logger.service';

interface ZaakPayConfig {
  merchantId: string;
  secretKey: string;
  checkoutUrl: string;
  apiUrl: string;
}

@Injectable()
export class ZaakpayService {
  private config: ZaakPayConfig;
  private baseUrl: string;

  constructor(
    private configService: ConfigService,
    private paymentLogger: PaymentLoggerService,
  ) {
    const environment =
      this.configService.get<string>('zaakpay.environment') || 'staging';
    const isProduction = environment === 'production';

    // Force usage of api.zaakpay.com as credentials seem to be for this environment
    // even if environment is set to staging in config
    this.baseUrl = 'https://api.zaakpay.com';

    this.config = {
      merchantId:
        this.configService.get<string>('zaakpay.merchantIdentifier') || '',
      secretKey: this.configService.get<string>('zaakpay.secretKey') || '',
      checkoutUrl: `${this.baseUrl}${this.configService.get<string>('zaakpay.endpoints.customCheckout') || '/transactU?v=8'}`,
      apiUrl: this.baseUrl,
    };

    this.paymentLogger.log('ZaakPay service initialized', {
      environment,
      baseUrl: this.baseUrl,
      checkoutUrl: this.config.checkoutUrl,
    });
  }

  private generateChecksum(data: string): string {
    return crypto
      .createHmac('sha256', this.config.secretKey)
      .update(data)
      .digest('hex');
  }

  verifyChecksum(data: string, receivedChecksum: string): boolean {
    const calculatedChecksum = this.generateChecksum(data);
    return calculatedChecksum === receivedChecksum;
  }

  async initiatePayment(params: {
    orderId: string;
    amount: string;
    buyerEmail: string;
    buyerName: string;
    buyerPhone: string;
    productDescription: string;
    returnUrl: string;
    paymentMode?: string;
  }): Promise<{ checkoutUrl: string; checksumData: any }> {
    const amountInPaisa = Math.round(
      parseFloat(params.amount) * 100,
    ).toString();

    const environment =
      this.configService.get<string>('zaakpay.environment') || 'staging';
    const isProduction = environment === 'production';

    const mode = isProduction ? '1' : '0';

    const payload: any = {
      merchantIdentifier: this.config.merchantId,
      mode: mode,
      merchantIpAddress: '127.0.0.1',
      debitorcredit: 'upi',
      orderDetail: {
        orderId: params.orderId,
        amount: amountInPaisa,
        currency: 'INR',
        productDescription: params.productDescription,
        email: params.buyerEmail,
        phone: params.buyerPhone,
        txnDate: new Date().toISOString().split('T')[0],
        purpose: '1',
      },
      returnUrl: params.returnUrl,
    };

    if (params.paymentMode === 'upiqr') {
      payload.paymentInstrument = {
        paymentMode: 'upiqr',
      };
    }

    const jsonPayload = JSON.stringify(payload);
    const checksum = this.generateChecksum(jsonPayload);

    this.paymentLogger.logPSPRequest({
      endpoint: '/transactU?v=8',
      method: 'POST',
      payload: { data: jsonPayload, checksum },
    });

    this.paymentLogger.log('Payment initiation prepared', {
      event: 'PAYMENT_INITIATION_PREPARED',
      orderId: params.orderId,
      amount: params.amount,
      amountInPaisa,
      mode,
      checkoutUrl: this.config.checkoutUrl,
      returnUrl: params.returnUrl,
      environment: isProduction ? 'production' : 'staging',
    });

    if (params.paymentMode === 'upiqr') {
      try {
        const formData = new URLSearchParams();
        formData.append('data', jsonPayload);
        formData.append('checksum', checksum);

        this.paymentLogger.log('Calling ZaakPay for UPI QR', {
          url: this.config.checkoutUrl,
          orderId: params.orderId,
        });

        const response = await axios.post(
          this.config.checkoutUrl,
          formData.toString(),
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
          },
        );

        this.paymentLogger.logPSPResponse({
          endpoint: '/transactU?v=8',
          status: response.status,
          response: response.data,
        });

        return {
          checkoutUrl: this.config.checkoutUrl,
          checksumData: {
            ...response.data,
            sentData: jsonPayload,
            sentChecksum: checksum,
          },
        };
      } catch (error) {
        this.paymentLogger.error(
          'ZaakPay UPI QR API call failed',
          error.stack,
          {
            orderId: params.orderId,
            error: error.message,
          },
        );
        throw error;
      }
    }

    return {
      checkoutUrl: this.config.checkoutUrl,
      checksumData: {
        data: jsonPayload,
        checksum,
      },
    };
  }

  async checkTransactionStatus(params: {
    orderId: string;
    merchantRefId?: string;
  }): Promise<any> {
    const data = {
      merchantIdentifier: this.config.merchantId,
      mode: '0',
      orderDetail: {
        orderId: params.orderId,
      },
      ...(params.merchantRefId && {
        refundDetail: {
          merchantRefId: params.merchantRefId,
        },
      }),
    };

    const dataString = JSON.stringify(data);
    const checksum = this.generateChecksum(dataString);

    this.paymentLogger.logPSPRequest({
      endpoint: '/checkTxn?v=5',
      method: 'POST',
      payload: { data: dataString, checksum },
    });

    try {
      const response = await axios.post(
        `${this.config.apiUrl}/checkTxn?v=5`,
        new URLSearchParams({
          data: dataString,
          checksum: checksum,
        }).toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
      );

      this.paymentLogger.logPSPResponse({
        endpoint: '/checkTxn?v=5',
        status: response.status,
        response: response.data,
      });

      return response.data;
    } catch (error) {
      this.paymentLogger.error('Check transaction status failed', error.stack, {
        orderId: params.orderId,
        error: error.message,
      });
      throw error;
    }
  }

  async initiateRefund(params: {
    orderId: string;
    amount?: string;
    updateReason: string;
    merchantRefId: string;
    isPartialRefund: boolean;
  }): Promise<any> {
    const data: any = {
      merchantIdentifier: this.config.merchantId,
      orderDetail: {
        orderId: params.orderId,
      },
      mode: '0',
      updateDesired: params.isPartialRefund ? '22' : '14',
      updateReason: params.updateReason,
      merchantRefId: params.merchantRefId,
    };

    if (params.isPartialRefund && params.amount) {
      const amountInPaisa = Math.round(
        parseFloat(params.amount) * 100,
      ).toString();
      data.orderDetail.amount = amountInPaisa;
    }

    const dataString = JSON.stringify(data);
    const checksum = this.generateChecksum(dataString);

    this.paymentLogger.logPSPRequest({
      endpoint: '/updateTxn',
      method: 'POST',
      payload: { data: dataString, checksum },
    });

    try {
      const response = await axios.post(
        `${this.config.apiUrl}/updateTxn`,
        new URLSearchParams({
          data: dataString,
          checksum: checksum,
        }).toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
      );

      this.paymentLogger.logPSPResponse({
        endpoint: '/updateTxn',
        status: response.status,
        response: response.data,
      });

      return response.data;
    } catch (error) {
      this.paymentLogger.error('Refund initiation failed', error.stack, {
        orderId: params.orderId,
        error: error.message,
      });
      throw error;
    }
  }
}
