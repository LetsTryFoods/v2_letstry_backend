import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PaymentRefund, PaymentOrder, PaymentStatus } from './payment.schema';
import { ZaakpayService } from './zaakpay.service';
import { LedgerService } from './ledger.service';
import { PaymentLoggerService } from './payment-logger.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class RefundService {
  constructor(
    @InjectModel(PaymentRefund.name)
    private paymentRefundModel: Model<PaymentRefund>,
    @InjectModel(PaymentOrder.name)
    private paymentOrderModel: Model<PaymentOrder>,
    private zaakpayService: ZaakpayService,
    private ledgerService: LedgerService,
    private paymentLogger: PaymentLoggerService,
  ) {}

  async initiateRefund(params: {
    paymentOrderId: string;
    refundAmount: string;
    reason: string;
    isPartialRefund: boolean;
  }): Promise<PaymentRefund> {
    const paymentOrder = await this.paymentOrderModel.findOne({
      paymentOrderId: params.paymentOrderId,
    });

    if (!paymentOrder) {
      throw new Error('Payment order not found');
    }

    if (paymentOrder.paymentOrderStatus !== PaymentStatus.SUCCESS) {
      throw new Error('Can only refund successful payments');
    }

    const refundAmount = parseFloat(params.refundAmount);
    const orderAmount = parseFloat(paymentOrder.amount);

    if (refundAmount > orderAmount) {
      throw new Error('Refund amount cannot exceed payment amount');
    }

    const refundId = `REF_${uuidv4()}`;
    const merchantRefId = `MREF_${Date.now()}_${uuidv4().substring(0, 8)}`;

    const refund = new this.paymentRefundModel({
      refundId,
      paymentOrderId: params.paymentOrderId,
      refundAmount: params.refundAmount,
      currency: paymentOrder.currency,
      reason: params.reason,
      refundStatus: PaymentStatus.EXECUTING,
    });

    await refund.save();

    this.paymentLogger.logRefundInitiation({
      refundId,
      paymentOrderId: params.paymentOrderId,
      refundAmount: params.refundAmount,
    });

    try {
      const zaakpayResponse = await this.zaakpayService.initiateRefund({
        orderId: params.paymentOrderId,
        amount: params.isPartialRefund ? params.refundAmount : undefined,
        updateReason: params.reason,
        merchantRefId,
        isPartialRefund: params.isPartialRefund,
      });

      if (
        zaakpayResponse.responseCode === '230' ||
        zaakpayResponse.responseCode === '245'
      ) {
        await this.paymentRefundModel.findOneAndUpdate(
          { refundId },
          {
            refundStatus: PaymentStatus.SUCCESS,
            zaakpayRefundId: merchantRefId,
            pspResponseCode: zaakpayResponse.responseCode,
            pspResponseMessage: zaakpayResponse.responseDescription,
            pspRawResponse: zaakpayResponse,
            processedAt: new Date(),
          },
        );

        await this.ledgerService.recordRefundTransaction({
          paymentOrderId: params.paymentOrderId,
          identityId: paymentOrder.identityId.toString(),
          amount: params.refundAmount,
          currency: paymentOrder.currency,
          refundId,
        });

        const newStatus = params.isPartialRefund
          ? PaymentStatus.PARTIALLY_REFUNDED
          : PaymentStatus.REFUNDED;

        await this.paymentOrderModel.findOneAndUpdate(
          { paymentOrderId: params.paymentOrderId },
          { paymentOrderStatus: newStatus },
        );

        this.paymentLogger.logRefundSuccess({
          refundId,
          zaakpayRefundId: merchantRefId,
          amount: params.refundAmount,
        });
      } else {
        await this.paymentRefundModel.findOneAndUpdate(
          { refundId },
          {
            refundStatus: PaymentStatus.FAILED,
            pspResponseCode: zaakpayResponse.responseCode,
            pspResponseMessage: zaakpayResponse.responseDescription,
            pspRawResponse: zaakpayResponse,
            processedAt: new Date(),
          },
        );

        this.paymentLogger.logRefundFailure({
          refundId,
          reason: zaakpayResponse.responseDescription,
          pspResponseCode: zaakpayResponse.responseCode,
        });
      }

      const updatedRefund = await this.paymentRefundModel.findOne({ refundId });
      if (!updatedRefund) {
        throw new Error('Refund not found after update');
      }
      return updatedRefund;
    } catch (error) {
      await this.paymentRefundModel.findOneAndUpdate(
        { refundId },
        {
          refundStatus: PaymentStatus.FAILED,
          pspResponseMessage: error.message,
          processedAt: new Date(),
        },
      );

      this.paymentLogger.logRefundFailure({
        refundId,
        reason: error.message,
      });

      throw error;
    }
  }

  async checkRefundStatus(refundId: string): Promise<PaymentRefund> {
    const refund = await this.paymentRefundModel.findOne({ refundId });

    if (!refund) {
      throw new Error('Refund not found');
    }

    if (
      refund.refundStatus === PaymentStatus.SUCCESS ||
      refund.refundStatus === PaymentStatus.FAILED
    ) {
      return refund;
    }

    const paymentOrder = await this.paymentOrderModel.findOne({
      paymentOrderId: refund.paymentOrderId.toString(),
    });

    if (!paymentOrder) {
      throw new Error('Payment order not found');
    }

    try {
      const zaakpayStatus =
        await this.zaakpayService.checkTransactionStatus({
          orderId: paymentOrder.paymentOrderId,
          merchantRefId: refund.zaakpayRefundId,
        });

      if (zaakpayStatus.success && zaakpayStatus.orders?.length > 0) {
        const order = zaakpayStatus.orders[0];

        if (order.refundDetails && order.refundDetails.length > 0) {
          const refundDetail = order.refundDetails.find(
            (r: any) => r.merchantRefId === refund.zaakpayRefundId,
          );

          if (refundDetail) {
            await this.paymentRefundModel.findOneAndUpdate(
              { refundId },
              {
                refundStatus: PaymentStatus.SUCCESS,
                pspRawResponse: refundDetail,
                processedAt: new Date(),
              },
            );
          }
        }
      }

      const updatedRefund = await this.paymentRefundModel.findOne({ refundId });
      if (!updatedRefund) {
        throw new Error('Refund not found after status check');
      }
      return updatedRefund;
    } catch (error) {
      this.paymentLogger.error('Check refund status failed', error.stack, {
        refundId,
        error: error.message,
      });
      return refund;
    }
  }

  async getRefundsByPaymentOrder(
    paymentOrderId: string,
  ): Promise<PaymentRefund[]> {
    return this.paymentRefundModel.find({ paymentOrderId }).exec();
  }

  async getRefundsByIdentity(identityId: string): Promise<PaymentRefund[]> {
    const paymentOrders = await this.paymentOrderModel
      .find({ identityId })
      .select('paymentOrderId')
      .exec();

    const paymentOrderIds = paymentOrders.map((po) => po.paymentOrderId);

    return this.paymentRefundModel
      .find({ paymentOrderId: { $in: paymentOrderIds } })
      .exec();
  }
}
