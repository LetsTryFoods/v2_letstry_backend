import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { PaymentEvent, PaymentOrder, PaymentStatus } from './payment.schema';
import { PaymentExecutorService } from './payment-executor.service';
import { RefundService } from './refund.service';
import { PaymentLoggerService } from './payment-logger.service';
import { InitiatePaymentInput, ProcessRefundInput } from './payment.input';

@Injectable()
export class PaymentService {
  constructor(
    @InjectModel(PaymentEvent.name) private paymentEventModel: Model<PaymentEvent>,
    @InjectModel(PaymentOrder.name) private paymentOrderModel: Model<PaymentOrder>,
    private readonly paymentExecutorService: PaymentExecutorService,
    private readonly refundService: RefundService,
    private readonly paymentLogger: PaymentLoggerService,
    private readonly configService: ConfigService,
  ) {}

  async initiatePayment(identityId: string, input: InitiatePaymentInput) {
    try {
      const paymentEvent = await this.paymentEventModel.create({
        cartId: input.cartId,
        identityId,
        totalAmount: input.amount,
        currency: input.currency,
        isPaymentDone: false,
      });

      this.paymentLogger.logPaymentInitiation({
        paymentOrderId: paymentEvent._id.toString(),
        userId: identityId,
        amount: input.amount,
        currency: input.currency,
      });

      const paymentOrder = await this.paymentOrderModel.create({
        paymentOrderId: `PAY_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        paymentEventId: paymentEvent._id.toString(),
        identityId,
        amount: input.amount,
        currency: input.currency,
        paymentOrderStatus: PaymentStatus.NOT_STARTED,
        retryCount: 0,
      });

      const returnUrl = input.returnUrl || this.configService.get<string>('zaakpay.returnUrl') || '';

      const checkoutData = await this.paymentExecutorService.executePaymentOrder({
        paymentOrderId: paymentOrder.paymentOrderId,
        identityId,
        amount: input.amount,
        currency: input.currency,
        buyerEmail: `identity_${identityId}@temp.com`,
        buyerName: 'Customer',
        buyerPhone: '9999999999',
        productDescription: 'Order Payment',
        returnUrl,
      });

      return {
        paymentOrderId: paymentOrder.paymentOrderId,
        checkoutUrl: checkoutData.checkoutUrl,
        checksumData: checkoutData.checksumData,
      };
    } catch (error) {
      this.paymentLogger.logPaymentFailure({
        paymentOrderId: 'N/A',
        reason: `Initiation failed: ${error.message}`,
        pspResponseCode: 'N/A',
      });
      throw new BadRequestException(`Failed to initiate payment: ${error.message}`);
    }
  }

  async getPaymentStatus(paymentOrderId: string) {
    const paymentOrder = await this.paymentOrderModel.findOne({ paymentOrderId });

    if (!paymentOrder) {
      throw new NotFoundException('Payment order not found');
    }

    await this.paymentExecutorService.checkPaymentStatus(paymentOrderId);

    const updatedPaymentOrder = await this.paymentOrderModel.findOne({ paymentOrderId });

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
      throw new BadRequestException('Unauthorized: This payment does not belong to you');
    }

    if (paymentOrder.paymentOrderStatus !== PaymentStatus.SUCCESS) {
      throw new BadRequestException('Cannot refund: Payment was not successful');
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

  async getPaymentsByIdentity(identityId: string, mergedGuestIds: string[] = []) {
    const identityIds = [identityId, ...mergedGuestIds];

    return this.paymentOrderModel
      .find({
        identityId: { $in: identityIds },
      })
      .sort({ createdAt: -1 })
      .exec();
  }

  async getPaymentOrderByPaymentOrderId(paymentOrderId: string) {
    const paymentOrder = await this.paymentOrderModel.findOne({ paymentOrderId });

    if (!paymentOrder) {
      throw new NotFoundException('Payment order not found');
    }

    return paymentOrder;
  }
}
