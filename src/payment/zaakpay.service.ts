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
    const environment = this.configService.get<string>('zaakpay.environment') || 'staging';
    const isProduction = environment === 'production';

    this.baseUrl = isProduction
      ? this.configService.get<string>('zaakpay.baseUrl.production') || 'https://api.zaakpay.com'
      : this.configService.get<string>('zaakpay.baseUrl.staging') || 'https://zaakstaging.zaakpay.com';

    this.config = {
      merchantId: this.configService.get<string>('zaakpay.merchantIdentifier') || '',
      secretKey: this.configService.get<string>('zaakpay.secretKey') || '',
      checkoutUrl: `${this.baseUrl}${this.configService.get<string>('zaakpay.endpoints.expressCheckout') || '/api/paymentTransact/V8'}`,
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
  }): Promise<{ checkoutUrl: string; checksumData: any }> {
    const amountInPaisa = Math.round(parseFloat(params.amount) * 100).toString();
    
    const environment = this.configService.get<string>('zaakpay.environment') || 'staging';
    const isProduction = environment === 'production';
    
    const mode = isProduction ? '1' : '0';

    const rawData = {
      amount: amountInPaisa,
      buyerEmail: params.buyerEmail,
      buyerFirstName: params.buyerName,
      buyerPhoneNumber: params.buyerPhone,
      currency: 'INR',
      merchantIdentifier: this.config.merchantId,
      mode: mode,
      orderId: params.orderId,
      productDescription: params.productDescription,
      purpose: '1',
      returnUrl: params.returnUrl,
      txnDate: new Date().toISOString().split('T')[0],
      txnType: '1',
      zpPayOption: '1',
    };

    const validParams: Record<string, string> = Object.entries(rawData)
      .filter(([_, value]) => value !== '' && value !== null && value !== undefined)
      .reduce((acc, [k, v]) => ({ ...acc, [k]: v }), {});

    const sortedKeys = Object.keys(validParams).sort();

    const checksumString = sortedKeys
      .map(key => `${key}=${validParams[key]}`)
      .join('&') + '&';

    this.paymentLogger.log('Checksum calculation', {
      event: 'CHECKSUM_STRING_GENERATED',
      orderId: params.orderId,
      checksumString,
      sortedKeys,
    });

    const checksum = this.generateChecksum(checksumString);

    this.paymentLogger.logPSPRequest({
      endpoint: '/api/paymentTransact/V8',
      method: 'POST',
      payload: { ...validParams, checksum },
    });

    this.paymentLogger.log('Payment initiation prepared', {
      event: 'PAYMENT_INITIATION_PREPARED',
      orderId: params.orderId,
      amount: params.amount,
      amountInPaisa,
      zpPayOption: validParams.zpPayOption,
      mode: validParams.mode,
      modeDescription: mode === '1' ? 'Domain verification enabled (Production)' : 'Domain verification disabled (Staging/Dev)',
      checkoutUrl: this.config.checkoutUrl,
      returnUrl: params.returnUrl,
      environment: isProduction ? 'production' : 'staging',
    });

    return {
      checkoutUrl: this.config.checkoutUrl,
      checksumData: {
        ...validParams,
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
      const amountInPaisa = Math.round(parseFloat(params.amount) * 100).toString();
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

  async getSettlementReport(utrDate: string): Promise<any> {
    const checksumString = `${this.config.merchantId},${utrDate}`;
    const checksum = this.generateChecksum(checksumString);

    const data = {
      merchantIdentifier: this.config.merchantId,
      checksum: checksum,
      utr_date: utrDate,
    };

    this.paymentLogger.logPSPRequest({
      endpoint: '/api/v2/getSettlementReport',
      method: 'POST',
      payload: data,
    });

    try {
      const response = await axios.post(
        `${this.config.apiUrl}/api/v2/getSettlementReport`,
        data,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );

      this.paymentLogger.logPSPResponse({
        endpoint: '/api/v2/getSettlementReport',
        status: response.status,
        response: response.data,
      });

      return response.data;
    } catch (error) {
      this.paymentLogger.error('Get settlement report failed', error.stack, {
        utrDate,
        error: error.message,
      });
      throw error;
    }
  }

  verifyWebhookChecksum(txnData: string, receivedChecksum: string): boolean {
    return this.verifyChecksum(txnData, receivedChecksum);
  }

  parseWebhookData(txnData: string): any {
    try {
      return JSON.parse(txnData);
    } catch (error) {
      this.paymentLogger.error('Failed to parse webhook data', error.stack, {
        txnData,
      });
      throw new Error('Invalid webhook data format');
    }
  }
}
