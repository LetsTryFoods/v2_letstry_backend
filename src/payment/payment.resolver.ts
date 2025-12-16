import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { PaymentService } from './payment.service';
import {
  InitiatePaymentInput,
  ProcessRefundInput,
  InitiateUpiQrPaymentInput,
} from './payment.input';
import {
  InitiatePaymentResponse,
  InitiateUpiQrPaymentResponse,
  PaymentStatusResponse,
  RefundResponse,
  PaymentOrderType,
} from './payment.graphql';
import { Public } from '../common/decorators/public.decorator';
import { DualAuthGuard } from '../authentication/common/dual-auth.guard';
import { OptionalUser } from '../common/decorators/optional-user.decorator';

@Resolver()
export class PaymentResolver {
  constructor(private readonly paymentService: PaymentService) {}

  @Mutation(() => InitiatePaymentResponse)
  @Public()
  @UseGuards(DualAuthGuard)
  async initiatePayment(
    @Args('input') input: InitiatePaymentInput,
    @OptionalUser() user: any,
  ): Promise<InitiatePaymentResponse> {
    if (!user?._id) {
      throw new Error('User identification required');
    }
    return this.paymentService.initiatePayment(user._id, input);
  }

  @Mutation(() => InitiateUpiQrPaymentResponse)
  @Public()
  @UseGuards(DualAuthGuard)
  async initiateUpiQrPayment(
    @Args('input') input: InitiateUpiQrPaymentInput,
    @OptionalUser() user: any,
  ): Promise<InitiateUpiQrPaymentResponse> {
    if (!user?._id) {
      throw new Error('User identification required');
    }
    return this.paymentService.initiateUpiQrPayment(user._id, input);
  }

  @Query(() => PaymentStatusResponse)
  @Public()
  @UseGuards(DualAuthGuard)
  async getPaymentStatus(
    @Args('paymentOrderId') paymentOrderId: string,
  ): Promise<PaymentStatusResponse> {
    const result = await this.paymentService.getPaymentStatus(paymentOrderId);
    const paymentOrder = result.paymentOrder.toObject
      ? result.paymentOrder.toObject()
      : result.paymentOrder;

    return {
      paymentOrderId: result.paymentOrderId,
      status: result.status,
      message: result.message,
      paymentOrder: {
        ...paymentOrder,
        _id: paymentOrder._id?.toString(),
        identityId: paymentOrder.identityId?.toString(),
        paymentEventId: paymentOrder.paymentEventId?.toString(),
        orderId: paymentOrder.orderId?.toString(),
      },
    } as any;
  }

  @Mutation(() => RefundResponse)
  @Public()
  @UseGuards(DualAuthGuard)
  async processRefund(
    @Args('input') input: ProcessRefundInput,
    @OptionalUser() user: any,
  ): Promise<RefundResponse> {
    if (!user?._id) {
      throw new Error('User identification required');
    }
    return this.paymentService.processRefund(user._id, input);
  }

  @Query(() => [PaymentOrderType])
  @Public()
  @UseGuards(DualAuthGuard)
  async myPayments(@OptionalUser() user: any): Promise<any[]> {
    if (!user?._id) {
      throw new Error('User identification required');
    }

    const mergedGuestIds = user.mergedGuestIds || [];
    const payments = await this.paymentService.getPaymentsByIdentity(
      user._id,
      mergedGuestIds,
    );
    return payments.map((p) => (p.toObject ? p.toObject() : p));
  }

  @Query(() => PaymentOrderType)
  @Public()
  @UseGuards(DualAuthGuard)
  async getPaymentOrderById(
    @Args('paymentOrderId') paymentOrderId: string,
  ): Promise<any> {
    const payment =
      await this.paymentService.getPaymentOrderByPaymentOrderId(paymentOrderId);
    return payment.toObject ? payment.toObject() : payment;
  }
}
