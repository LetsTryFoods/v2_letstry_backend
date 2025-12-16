import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PaymentOrder, PaymentStatus } from './payment.schema';
import { ZaakpayService } from './zaakpay.service';
import { LedgerService } from './ledger.service';
import { PaymentLoggerService } from './payment-logger.service';

@Injectable()
export class PaymentExecutorService {
  constructor(
    @InjectModel(PaymentOrder.name)
    private paymentOrderModel: Model<PaymentOrder>,
    private zaakpayService: ZaakpayService,
    private ledgerService: LedgerService,
    private paymentLogger: PaymentLoggerService,
  ) {}

  async executePaymentOrder(params: {
    paymentOrderId: string;
    identityId: string;
    amount: string;
    currency: string;
    buyerEmail: string;
    buyerName: string;
    buyerPhone: string;
    productDescription: string;
    returnUrl: string;
  }): Promise<{
    checkoutUrl: string;
    zaakpayOrderId: string;
    checksumData: any;
  }> {
    this.paymentLogger.logPaymentExecution({
      paymentOrderId: params.paymentOrderId,
      zaakpayOrderId: params.paymentOrderId,
      status: PaymentStatus.EXECUTING,
    });

    await this.paymentOrderModel.findOneAndUpdate(
      { paymentOrderId: params.paymentOrderId },
      {
        paymentOrderStatus: PaymentStatus.EXECUTING,
        executedAt: new Date(),
      },
    );

    const paymentData = await this.zaakpayService.initiatePayment({
      orderId: params.paymentOrderId,
      amount: params.amount,
      buyerEmail: params.buyerEmail,
      buyerName: params.buyerName,
      buyerPhone: params.buyerPhone,
      productDescription: params.productDescription,
      returnUrl: params.returnUrl,
    });

    await this.paymentOrderModel.findOneAndUpdate(
      { paymentOrderId: params.paymentOrderId },
      {
        zaakpayOrderId: params.paymentOrderId,
      },
    );

    return {
      checkoutUrl: paymentData.checkoutUrl,
      zaakpayOrderId: params.paymentOrderId,
      checksumData: paymentData.checksumData,
    };
  }

  async handlePaymentSuccess(params: {
    paymentOrderId: string;
    zaakpayTxnId: string;
    paymentMethod: string;
    bankTxnId?: string;
    cardType?: string;
    cardNumber?: string;
    pspRawResponse: any;
  }): Promise<void> {
    const paymentOrder = await this.paymentOrderModel.findOne({
      paymentOrderId: params.paymentOrderId,
    });

    if (!paymentOrder) {
      throw new Error('Payment order not found');
    }

    await this.paymentOrderModel.findOneAndUpdate(
      { paymentOrderId: params.paymentOrderId },
      {
        paymentOrderStatus: PaymentStatus.SUCCESS,
        zaakpayTxnId: params.zaakpayTxnId,
        paymentMethod: params.paymentMethod,
        bankTxnId: params.bankTxnId,
        cardType: params.cardType,
        cardNumber: params.cardNumber,
        pspRawResponse: params.pspRawResponse,
        pspResponseCode: params.pspRawResponse.responseCode,
        pspResponseMessage: params.pspRawResponse.responseDescription,
        completedAt: new Date(),
      },
    );

    await this.ledgerService.recordPaymentTransaction({
      paymentOrderId: params.paymentOrderId,
      identityId: paymentOrder.identityId.toString(),
      amount: paymentOrder.amount,
      currency: paymentOrder.currency,
    });

    await this.paymentOrderModel.findOneAndUpdate(
      { paymentOrderId: params.paymentOrderId },
      { ledgerUpdated: true },
    );

    this.paymentLogger.logPaymentSuccess({
      paymentOrderId: params.paymentOrderId,
      zaakpayTxnId: params.zaakpayTxnId,
      amount: paymentOrder.amount,
    });
  }

  async handlePaymentFailure(params: {
    paymentOrderId: string;
    failureReason: string;
    pspResponseCode?: string;
    pspResponseMessage?: string;
    pspRawResponse?: any;
  }): Promise<void> {
    await this.paymentOrderModel.findOneAndUpdate(
      { paymentOrderId: params.paymentOrderId },
      {
        paymentOrderStatus: PaymentStatus.FAILED,
        failureReason: params.failureReason,
        pspResponseCode: params.pspResponseCode,
        pspResponseMessage: params.pspResponseMessage,
        pspRawResponse: params.pspRawResponse,
        completedAt: new Date(),
      },
    );

    this.paymentLogger.logPaymentFailure({
      paymentOrderId: params.paymentOrderId,
      reason: params.failureReason,
      pspResponseCode: params.pspResponseCode,
    });
  }

  async handlePaymentPending(params: {
    paymentOrderId: string;
    pspResponseMessage?: string;
  }): Promise<void> {
    await this.paymentOrderModel.findOneAndUpdate(
      { paymentOrderId: params.paymentOrderId },
      {
        paymentOrderStatus: PaymentStatus.PENDING,
        pspResponseMessage: params.pspResponseMessage,
      },
    );

    this.paymentLogger.log('Payment pending', {
      paymentOrderId: params.paymentOrderId,
      message: params.pspResponseMessage,
    });
  }

  async checkPaymentStatus(
    paymentOrderId: string,
  ): Promise<{ status: PaymentStatus; details: any }> {
    const paymentOrder = await this.paymentOrderModel.findOne({
      paymentOrderId,
    });

    if (!paymentOrder) {
      throw new Error('Payment order not found');
    }

    if (
      paymentOrder.paymentOrderStatus === PaymentStatus.SUCCESS ||
      paymentOrder.paymentOrderStatus === PaymentStatus.FAILED
    ) {
      return {
        status: paymentOrder.paymentOrderStatus,
        details: paymentOrder,
      };
    }

    const zaakpayStatus =
      await this.zaakpayService.checkTransactionStatus({
        orderId: paymentOrderId,
      });

    if (zaakpayStatus.success && zaakpayStatus.orders?.length > 0) {
      const order = zaakpayStatus.orders[0];

      if (order.txnStatus === '0') {
        await this.handlePaymentSuccess({
          paymentOrderId,
          zaakpayTxnId: order.orderDetail.txnId,
          paymentMethod: order.paymentInstrument?.paymentMode || 'UNKNOWN',
          bankTxnId: order.paymentInstrument?.card?.bank,
          cardType: order.paymentInstrument?.card?.cardType,
          cardNumber: order.paymentInstrument?.card?.cardToken,
          pspRawResponse: order,
        });

        return {
          status: PaymentStatus.SUCCESS,
          details: order,
        };
      } else if (order.txnStatus === '1') {
        await this.handlePaymentFailure({
          paymentOrderId,
          failureReason: order.responseDescription || 'Payment failed',
          pspResponseCode: order.responseCode,
          pspResponseMessage: order.responseDescription,
          pspRawResponse: order,
        });

        return {
          status: PaymentStatus.FAILED,
          details: order,
        };
      } else if (order.txnStatus === '2') {
        await this.handlePaymentPending({
          paymentOrderId,
          pspResponseMessage: order.responseDescription,
        });

        return {
          status: PaymentStatus.PENDING,
          details: order,
        };
      }
    }

    return {
      status: paymentOrder.paymentOrderStatus,
      details: paymentOrder,
    };
  }

  async retryPayment(paymentOrderId: string): Promise<void> {
    const paymentOrder = await this.paymentOrderModel.findOne({
      paymentOrderId,
    });

    if (!paymentOrder) {
      throw new Error('Payment order not found');
    }

    if (paymentOrder.retryCount >= 3) {
      this.paymentLogger.error('Max retry attempts reached', undefined, {
        paymentOrderId,
        retryCount: paymentOrder.retryCount,
      });
      throw new Error('Maximum retry attempts reached');
    }

    await this.paymentOrderModel.findOneAndUpdate(
      { paymentOrderId },
      {
        $inc: { retryCount: 1 },
        paymentOrderStatus: PaymentStatus.NOT_STARTED,
      },
    );

    this.paymentLogger.logRetry({
      paymentOrderId,
      retryCount: paymentOrder.retryCount + 1,
      reason: 'Manual retry triggered',
    });
  }
}
