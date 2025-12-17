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
  private environment: string;
  private isProduction: boolean;
  private mode: string;

  constructor(
    private configService: ConfigService,
    private paymentLogger: PaymentLoggerService,
  ) {
    this.environment =
      this.configService.get<string>('zaakpay.environment') || 'staging';
    this.isProduction = this.environment === 'production';
    this.mode = this.isProduction ? '1' : '0';

    this.baseUrl =
      this.configService.get<string>('zaakpay.baseUrl') ||
      'https://zaakstaging.zaakpay.com';

    this.config = {
      merchantId:
        this.configService.get<string>('zaakpay.merchantIdentifier') || '',
      secretKey: this.configService.get<string>('zaakpay.secretKey') || '',
      checkoutUrl: `${this.baseUrl}${this.configService.get<string>('zaakpay.endpoints.customCheckout') || '/transactU?v=8'}`,
      apiUrl: this.baseUrl,
    };

    this.paymentLogger.log('ZaakPay service initialized', {
      environment: this.environment,
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
    const amountInPaisa = this.convertToRupeesPaisa(params.amount);

    const payload = this.buildPaymentPayload({
      orderId: params.orderId,
      amount: amountInPaisa,
      buyerEmail: params.buyerEmail,
      buyerPhone: params.buyerPhone,
      productDescription: params.productDescription,
      returnUrl: params.returnUrl,
      mode: this.mode,
      paymentMode: params.paymentMode,
    });

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
      mode: this.mode,
      checkoutUrl: this.config.checkoutUrl,
      returnUrl: params.returnUrl,
      environment: this.isProduction ? 'production' : 'staging',
    });

    if (params.paymentMode === 'upiqr') {
      return this.initiateUpiQrPayment(jsonPayload, checksum, params.orderId);
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
      mode: this.mode,
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
      const response = await this.makeZaakPayRequest(
        '/checkTxn?v=5',
        dataString,
        checksum,
      );

      this.paymentLogger.logPSPResponse({
        endpoint: '/checkTxn?v=5',
        status: response.status,
        response: response.data,
      });

      return response.data;
    } catch (error) {
      this.handleZaakPayError(error, 'Check transaction status failed', {
        orderId: params.orderId,
      });
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
      mode: this.mode,
      updateDesired: params.isPartialRefund ? '22' : '14',
      updateReason: params.updateReason,
      merchantRefId: params.merchantRefId,
    };

    if (params.isPartialRefund && params.amount) {
      data.orderDetail.amount = this.convertToRupeesPaisa(params.amount);
    }

    const dataString = JSON.stringify(data);
    const checksum = this.generateChecksum(dataString);

    this.paymentLogger.logPSPRequest({
      endpoint: '/updateTxn',
      method: 'POST',
      payload: { data: dataString, checksum },
    });

    try {
      const response = await this.makeZaakPayRequest(
        '/updateTxn',
        dataString,
        checksum,
      );

      this.paymentLogger.logPSPResponse({
        endpoint: '/updateTxn',
        status: response.status,
        response: response.data,
      });

      return response.data;
    } catch (error) {
      this.handleZaakPayError(error, 'Refund initiation failed', {
        orderId: params.orderId,
      });
    }
  }

  async getSettlementReport(date: string): Promise<any> {
    const data = {
      merchantIdentifier: this.config.merchantId,
      mode: this.mode,
      settlementDate: date,
    };

    const dataString = JSON.stringify(data);
    const checksum = this.generateChecksum(dataString);

    this.paymentLogger.logPSPRequest({
      endpoint: '/getSettlementReport',
      method: 'POST',
      payload: { data: dataString, checksum },
    });

    try {
      const response = await this.makeZaakPayRequest(
        '/getSettlementReport',
        dataString,
        checksum,
      );

      this.paymentLogger.logPSPResponse({
        endpoint: '/getSettlementReport',
        status: response.status,
        response: response.data,
      });

      return response.data;
    } catch (error) {
      this.handleZaakPayError(error, 'Get settlement report failed', {
        date,
      });
    }
  }

  private convertToRupeesPaisa(amount: string): string {
    return Math.round(parseFloat(amount) * 100).toString();
  }

  private buildPaymentPayload(params: {
    orderId: string;
    amount: string;
    buyerEmail: string;
    buyerPhone: string;
    productDescription: string;
    returnUrl: string;
    mode: string;
    paymentMode?: string;
  }): any {
    const payload: any = {
      merchantIdentifier: this.config.merchantId,
      mode: params.mode,
      merchantIpAddress: '127.0.0.1',
      debitorcredit: 'upi',
      orderDetail: {
        orderId: params.orderId,
        amount: params.amount,
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
    } else if (params.paymentMode === 'card') {
      payload.paymentInstrument = {
        paymentMode: 'card',
      };
    } else if (params.paymentMode === 'netbanking') {
      payload.paymentInstrument = {
        paymentMode: 'netbanking',
      };
    } else if (params.paymentMode === 'wallet') {
      payload.paymentInstrument = {
        paymentMode: 'wallet',
      };
    }

    return payload;
  }

  private async initiateUpiQrPayment(
    jsonPayload: string,
    checksum: string,
    orderId: string,
  ): Promise<{ checkoutUrl: string; checksumData: any }> {
    try {
      const formData = new URLSearchParams();
      formData.append('data', jsonPayload);
      formData.append('checksum', checksum);

      this.paymentLogger.log('Calling ZaakPay for UPI QR', {
        url: this.config.checkoutUrl,
        orderId,
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
      this.handleZaakPayError(error, 'ZaakPay UPI QR API call failed', {
        orderId,
      });
    }
  }

  private async makeZaakPayRequest(
    endpoint: string,
    dataString: string,
    checksum: string,
  ): Promise<any> {
    return axios.post(
      `${this.config.apiUrl}${endpoint}`,
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
  }

  private handleZaakPayError(
    error: any,
    context: string,
    additionalInfo: any,
  ): never {
    this.paymentLogger.error(context, error.stack, {
      ...additionalInfo,
      error: error.message,
    });
    throw error;
  }
}
