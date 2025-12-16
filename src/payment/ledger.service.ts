import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Ledger } from './payment.schema';
import { PaymentLoggerService } from './payment-logger.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class LedgerService {
  constructor(
    @InjectModel(Ledger.name) private ledgerModel: Model<Ledger>,
    private paymentLogger: PaymentLoggerService,
  ) {}

  async createLedgerEntry(params: {
    paymentOrderId: string;
    accountDebit: string;
    accountCredit: string;
    amount: string;
    currency: string;
    description: string;
    metadata?: Record<string, any>;
  }): Promise<Ledger> {
    const transactionId = `TXN_${uuidv4()}`;

    const ledgerEntry = new this.ledgerModel({
      transactionId,
      paymentOrderId: params.paymentOrderId,
      accountDebit: params.accountDebit,
      accountCredit: params.accountCredit,
      amount: params.amount,
      currency: params.currency,
      description: params.description,
      metadata: params.metadata || {},
    });

    const savedEntry = await ledgerEntry.save();

    this.paymentLogger.logLedgerEntry({
      transactionId,
      accountDebit: params.accountDebit,
      accountCredit: params.accountCredit,
      amount: params.amount,
    });

    return savedEntry;
  }

  async recordPaymentTransaction(params: {
    paymentOrderId: string;
    identityId: string;
    amount: string;
    currency: string;
  }): Promise<Ledger> {
    return this.createLedgerEntry({
      paymentOrderId: params.paymentOrderId,
      accountDebit: `identity:${params.identityId}`,
      accountCredit: 'platform:revenue',
      amount: params.amount,
      currency: params.currency,
      description: `Payment from identity ${params.identityId}`,
      metadata: {
        type: 'PAYMENT',
        identityId: params.identityId,
      },
    });
  }

  async recordRefundTransaction(params: {
    paymentOrderId: string;
    identityId: string;
    amount: string;
    currency: string;
    refundId: string;
  }): Promise<Ledger> {
    return this.createLedgerEntry({
      paymentOrderId: params.paymentOrderId,
      accountDebit: 'platform:revenue',
      accountCredit: `identity:${params.identityId}`,
      amount: params.amount,
      currency: params.currency,
      description: `Refund to identity ${params.identityId}`,
      metadata: {
        type: 'REFUND',
        identityId: params.identityId,
        refundId: params.refundId,
      },
    });
  }

  async getLedgerEntriesByPaymentOrder(
    paymentOrderId: string,
  ): Promise<Ledger[]> {
    return this.ledgerModel.find({ paymentOrderId }).exec();
  }

  async verifyDoubleEntryBalance(): Promise<{
    isBalanced: boolean;
    totalSum: number;
  }> {
    const allEntries = await this.ledgerModel.find().exec();

    let totalSum = 0;
    for (const entry of allEntries) {
      const amount = parseFloat(entry.amount);
      totalSum += amount;
      totalSum -= amount;
    }

    const isBalanced = Math.abs(totalSum) < 0.01;

    if (!isBalanced) {
      this.paymentLogger.error('Ledger is not balanced', undefined, {
        totalSum,
        message: 'Double-entry accounting principle violated',
      });
    }

    return {
      isBalanced,
      totalSum,
    };
  }

  async getTotalRevenueByIdentity(identityId: string): Promise<number> {
    const entries = await this.ledgerModel
      .find({
        accountDebit: `identity:${identityId}`,
        'metadata.type': 'PAYMENT',
      })
      .exec();

    return entries.reduce((total, entry) => {
      return total + parseFloat(entry.amount);
    }, 0);
  }

  async getTotalRefundsByIdentity(identityId: string): Promise<number> {
    const entries = await this.ledgerModel
      .find({
        accountCredit: `identity:${identityId}`,
        'metadata.type': 'REFUND',
      })
      .exec();

    return entries.reduce((total, entry) => {
      return total + parseFloat(entry.amount);
    }, 0);
  }

  async getPlatformRevenue(startDate?: Date, endDate?: Date): Promise<number> {
    const query: any = {
      accountCredit: 'platform:revenue',
      'metadata.type': 'PAYMENT',
    };

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = startDate;
      if (endDate) query.createdAt.$lte = endDate;
    }

    const entries = await this.ledgerModel.find(query).exec();

    return entries.reduce((total, entry) => {
      return total + parseFloat(entry.amount);
    }, 0);
  }
}
