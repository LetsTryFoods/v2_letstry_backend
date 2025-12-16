import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum PaymentStatus {
  NOT_STARTED = 'NOT_STARTED',
  EXECUTING = 'EXECUTING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  PENDING = 'PENDING',
  REFUNDED = 'REFUNDED',
  PARTIALLY_REFUNDED = 'PARTIALLY_REFUNDED',
}

export enum PaymentMethod {
  CREDIT_CARD = 'CREDIT_CARD',
  DEBIT_CARD = 'DEBIT_CARD',
  NET_BANKING = 'NET_BANKING',
  UPI = 'UPI',
  WALLET = 'WALLET',
}

@Schema({ timestamps: true })
export class PaymentEvent extends Document {
  @Prop({ required: true, type: Types.ObjectId, ref: 'Cart' })
  cartId: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'Identity' })
  identityId: Types.ObjectId;

  @Prop({ required: true })
  totalAmount: string;

  @Prop({ required: true })
  currency: string;

  @Prop({ default: false })
  isPaymentDone: boolean;

  @Prop({ type: Object })
  metadata: Record<string, any>;
}

export const PaymentEventSchema = SchemaFactory.createForClass(PaymentEvent);

@Schema({ timestamps: true })
export class PaymentOrder extends Document {
  @Prop({ required: true, unique: true })
  paymentOrderId: string;

  @Prop({ required: true, type: Types.ObjectId, ref: 'PaymentEvent' })
  paymentEventId: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'Identity' })
  identityId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Order' })
  orderId: Types.ObjectId;

  @Prop({ required: true })
  amount: string;

  @Prop({ required: true })
  currency: string;

  @Prop({ type: String, enum: PaymentStatus, default: PaymentStatus.NOT_STARTED })
  paymentOrderStatus: PaymentStatus;

  @Prop({ type: String, enum: PaymentMethod })
  paymentMethod: PaymentMethod;

  @Prop()
  zaakpayTxnId: string;

  @Prop()
  zaakpayOrderId: string;

  @Prop()
  zaakpayToken: string;

  @Prop()
  bankTxnId: string;

  @Prop()
  cardType: string;

  @Prop()
  cardNumber: string;

  @Prop({ default: false })
  ledgerUpdated: boolean;

  @Prop({ default: 0 })
  retryCount: number;

  @Prop()
  pspResponseCode: string;

  @Prop()
  pspResponseMessage: string;

  @Prop()
  failureReason: string;

  @Prop({ type: Date })
  executedAt: Date;

  @Prop({ type: Date })
  completedAt: Date;

  @Prop({ type: Object })
  pspRawResponse: Record<string, any>;

  createdAt: Date;
  updatedAt: Date;
}

export const PaymentOrderSchema = SchemaFactory.createForClass(PaymentOrder);

@Schema({ timestamps: true })
export class Ledger extends Document {
  @Prop({ required: true, unique: true })
  transactionId: string;

  @Prop({ required: true, type: Types.ObjectId, ref: 'PaymentOrder' })
  paymentOrderId: Types.ObjectId;

  @Prop({ required: true })
  accountDebit: string;

  @Prop({ required: true })
  accountCredit: string;

  @Prop({ required: true })
  amount: string;

  @Prop({ required: true })
  currency: string;

  @Prop({ required: true })
  description: string;

  @Prop({ type: Object })
  metadata: Record<string, any>;
}

export const LedgerSchema = SchemaFactory.createForClass(Ledger);

@Schema({ timestamps: true })
export class PaymentRefund extends Document {
  @Prop({ required: true, unique: true })
  refundId: string;

  @Prop({ required: true, type: Types.ObjectId, ref: 'PaymentOrder' })
  paymentOrderId: Types.ObjectId;

  @Prop({ required: true })
  refundAmount: string;

  @Prop({ required: true })
  currency: string;

  @Prop()
  reason: string;

  @Prop({ type: String, enum: PaymentStatus, default: PaymentStatus.NOT_STARTED })
  refundStatus: PaymentStatus;

  @Prop()
  zaakpayRefundId: string;

  @Prop()
  pspResponseCode: string;

  @Prop()
  pspResponseMessage: string;

  @Prop({ type: Date })
  processedAt: Date;

  @Prop({ type: Object })
  pspRawResponse: Record<string, any>;
}

export const PaymentRefundSchema = SchemaFactory.createForClass(PaymentRefund);

@Schema({ timestamps: true })
export class PaymentReconciliation extends Document {
  @Prop({ required: true, unique: true })
  reconciliationId: string;

  @Prop({ required: true })
  reconciliationDate: Date;

  @Prop({ required: true })
  settlementFileUrl: string;

  @Prop({ type: Array })
  discrepancies: Array<{
    paymentOrderId: string;
    systemAmount: string;
    pspAmount: string;
    difference: string;
    status: string;
    resolvedAt?: Date;
    resolution?: string;
  }>;

  @Prop({ default: 0 })
  totalDiscrepancies: number;

  @Prop({ default: 0 })
  resolvedDiscrepancies: number;

  @Prop()
  status: string;

  @Prop({ type: Date })
  processedAt: Date;
}

export const PaymentReconciliationSchema = SchemaFactory.createForClass(PaymentReconciliation);
