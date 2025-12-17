import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { PaymentEvent, PaymentOrder, PaymentStatus } from './payment.schema';
import { PaymentExecutorService } from './payment-executor.service';
import { RefundService } from './refund.service';
import { PaymentLoggerService } from './payment-logger.service';
import {
  InitiatePaymentInput,
  ProcessRefundInput,
  InitiateUpiQrPaymentInput,
} from './payment.input';
import { CartService } from '../cart/cart.service';

@Injectable()
export class PaymentService {
  constructor(
    @InjectModel(PaymentEvent.name)
    private paymentEventModel: Model<PaymentEvent>,
    @InjectModel(PaymentOrder.name)
    private paymentOrderModel: Model<PaymentOrder>,
    private readonly paymentExecutorService: PaymentExecutorService,
    private readonly refundService: RefundService,
    private readonly paymentLogger: PaymentLoggerService,
    private readonly configService: ConfigService,
    private readonly cartService: CartService,
  ) {}

  async initiatePayment(identityId: string, input: InitiatePaymentInput) {
    try {
      const paymentEvent = await this.createPaymentEvent({
        cartId: input.cartId,
        identityId,
        amount: input.amount,
        currency: input.currency,
      });

      const paymentOrder = await this.createPaymentOrder({
        paymentEventId: paymentEvent._id.toString(),
        identityId,
        amount: input.amount,
        currency: input.currency,
      });

      const checkoutData =
        await this.paymentExecutorService.executePaymentOrder({
          paymentOrderId: paymentOrder.paymentOrderId,
          identityId,
          amount: input.amount,
          currency: input.currency,
          buyerEmail: `identity_${identityId}@temp.com`,
          buyerName: 'Customer',
          buyerPhone: '9999999999',
          productDescription: 'Order Payment',
          returnUrl: this.getReturnUrl(),
        });

      return {
        paymentOrderId: paymentOrder.paymentOrderId,
        checkoutUrl: checkoutData.checkoutUrl,
        checksumData: checkoutData.checksumData,
      };
    } catch (error) {
      this.handlePaymentError(error, 'Initiation failed');
    }
  }

  async initiateUpiQrPayment(
    identityId: string,
    input: InitiateUpiQrPaymentInput,
  ) {
    try {
      const cart = await this.cartService.getCart(identityId);
      if (!cart) {
        throw new NotFoundException('Cart not found');
      }

      if (cart._id.toString() !== input.cartId) {
        throw new BadRequestException('Cart ID mismatch');
      }

      const amount = cart.totalsSummary.grandTotal.toFixed(2);
      const currency = 'INR';

      const paymentEvent = await this.createPaymentEvent({
        cartId: input.cartId,
        identityId,
        amount,
        currency,
      });

      const paymentOrder = await this.createPaymentOrder({
        paymentEventId: paymentEvent._id.toString(),
        identityId,
        amount,
        currency,
      });

      const zaakpayResponse =
        await this.paymentExecutorService.executePaymentOrder({
          paymentOrderId: paymentOrder.paymentOrderId,
          identityId,
          amount,
          currency,
          buyerEmail: input.buyerEmail,
          buyerName: input.buyerName,
          buyerPhone: input.buyerPhone,
          productDescription: 'UPI QR Payment',
          returnUrl: this.getReturnUrl(),
          paymentMode: 'upiqr',
        });

      const base64QrImage =
        zaakpayResponse.checksumData?.bankPostData?.link ||
        zaakpayResponse.checksumData?.link ||
        '';

      if (!base64QrImage) {
        this.paymentLogger.error('ZaakPay did not return QR code image', '', {
          paymentOrderId: paymentOrder.paymentOrderId,
          checksumData: zaakpayResponse.checksumData,
        });
        throw new BadRequestException('ZaakPay did not return QR code data');
      }

      return {
        paymentOrderId: paymentOrder.paymentOrderId,
        qrCodeData: base64QrImage,
        qrCodeUrl: zaakpayResponse.checkoutUrl,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        zaakpayTxnId: paymentOrder.zaakpayTxnId,
        amount,
        currency,
        responseCode: zaakpayResponse.checksumData?.responseCode || '100',
        responseMessage:
          zaakpayResponse.checksumData?.responseDescription ||
          'UPI QR payment initiated successfully',
      };
    } catch (error) {
      this.handlePaymentError(error, 'UPI QR Initiation failed');
    }
  }

  async getPaymentStatus(paymentOrderId: string) {
    const paymentOrder = await this.paymentOrderModel.findOne({
      paymentOrderId,
    });

    if (!paymentOrder) {
      throw new NotFoundException('Payment order not found');
    }

    await this.paymentExecutorService.checkPaymentStatus(paymentOrderId);

    const updatedPaymentOrder = await this.paymentOrderModel.findOne({
      paymentOrderId,
    });

    if (!updatedPaymentOrder) {
      throw new NotFoundException('Payment order not found after status check');
    }

    return {
      paymentOrderId,
      status: updatedPaymentOrder.paymentOrderStatus,
      message: updatedPaymentOrder.pspResponseMessage,
      paymentOrder: updatedPaymentOrder,
    };
  }

  async processRefund(identityId: string, input: ProcessRefundInput) {
    const paymentOrder = await this.paymentOrderModel.findOne({
      paymentOrderId: input.paymentOrderId,
    });

    if (!paymentOrder) {
      throw new NotFoundException('Payment order not found');
    }

    if (paymentOrder.identityId.toString() !== identityId) {
      throw new BadRequestException(
        'Unauthorized: This payment does not belong to you',
      );
    }

    if (paymentOrder.paymentOrderStatus !== PaymentStatus.SUCCESS) {
      throw new BadRequestException(
        'Cannot refund: Payment was not successful',
      );
    }

    try {
      const orderAmount = parseFloat(paymentOrder.amount);
      const refundAmount = parseFloat(input.refundAmount);
      const isPartialRefund = refundAmount < orderAmount;

      const refund = await this.refundService.initiateRefund({
        paymentOrderId: input.paymentOrderId,
        refundAmount: input.refundAmount,
        reason: input.reason || 'Customer requested refund',
        isPartialRefund,
      });

      return {
        refundId: refund.refundId,
        status: refund.refundStatus,
        message: refund.pspResponseMessage,
      };
    } catch (error) {
      throw new BadRequestException(`Refund failed: ${error.message}`);
    }
  }

  async getPaymentsByIdentity(
    identityId: string,
    mergedGuestIds: string[] = [],
  ) {
    const identityIds = [identityId, ...mergedGuestIds];

    return this.paymentOrderModel
      .find({
        identityId: { $in: identityIds },
      })
      .sort({ createdAt: -1 })
      .exec();
  }

  async getPaymentOrderByPaymentOrderId(paymentOrderId: string) {
    const paymentOrder = await this.paymentOrderModel.findOne({
      paymentOrderId,
    });

    if (!paymentOrder) {
      throw new NotFoundException('Payment order not found');
    }

    return paymentOrder;
  }

  private async createPaymentEvent(params: {
    cartId: string;
    identityId: string;
    amount: string;
    currency: string;
  }) {
    const paymentEvent = await this.paymentEventModel.create({
      cartId: params.cartId,
      identityId: params.identityId,
      totalAmount: params.amount,
      currency: params.currency,
      isPaymentDone: false,
    });

    this.paymentLogger.logPaymentInitiation({
      paymentOrderId: paymentEvent._id.toString(),
      userId: params.identityId,
      amount: params.amount,
      currency: params.currency,
    });

    return paymentEvent;
  }

  private async createPaymentOrder(params: {
    paymentEventId: string;
    identityId: string;
    amount: string;
    currency: string;
  }) {
    return this.paymentOrderModel.create({
      paymentOrderId: this.generatePaymentOrderId(),
      paymentEventId: params.paymentEventId,
      identityId: params.identityId,
      amount: params.amount,
      currency: params.currency,
      paymentOrderStatus: PaymentStatus.NOT_STARTED,
      retryCount: 0,
    });
  }

  private generatePaymentOrderId(): string {
    return `PAY_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getReturnUrl(): string {
    return this.configService.get<string>('zaakpay.returnUrl') || '';
  }

  private handlePaymentError(error: any, context: string): never {
    this.paymentLogger.logPaymentFailure({
      paymentOrderId: 'N/A',
      reason: `${context}: ${error.message}`,
      pspResponseCode: 'N/A',
    });
    throw new BadRequestException(`Failed to ${context.toLowerCase()}: ${error.message}`);
  }
}
