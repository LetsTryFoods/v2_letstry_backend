export interface PaymentGatewayProvider {
  initiatePayment(params: InitiatePaymentParams): Promise<InitiatePaymentResponse>;
  
  checkTransactionStatus(params: CheckStatusParams): Promise<TransactionStatusResponse>;
  
  initiateRefund(params: InitiateRefundParams): Promise<RefundResponse>;
  
  verifyWebhookChecksum(data: string, checksum: string): boolean;
  
  parseWebhookData(webhookBody: any): ParsedWebhookData;
  
  getSettlementReport?(params: SettlementReportParams): Promise<SettlementReport>;
}

export interface InitiatePaymentParams {
  orderId: string;
  amount: string;
  currency: string;
  buyerEmail: string;
  buyerName: string;
  buyerPhone: string;
  productDescription: string;
  returnUrl: string;
}

export interface InitiatePaymentResponse {
  checkoutUrl: string;
  checksumData: any;
  gatewayOrderId?: string;
  gatewayTransactionId?: string;
}

export interface CheckStatusParams {
  orderId: string;
  gatewayTransactionId?: string;
}

export interface TransactionStatusResponse {
  status: 'SUCCESS' | 'FAILED' | 'PENDING';
  transactionId?: string;
  responseCode?: string;
  responseMessage?: string;
  paymentMethod?: string;
  bankTransactionId?: string;
  cardType?: string;
  cardNumber?: string;
  rawResponse?: any;
}

export interface InitiateRefundParams {
  originalTransactionId: string;
  orderId: string;
  refundAmount: string;
  refundId: string;
  reason?: string;
}

export interface RefundResponse {
  success: boolean;
  refundId: string;
  gatewayRefundId?: string;
  responseCode?: string;
  responseMessage?: string;
  rawResponse?: any;
}

export interface ParsedWebhookData {
  orderId: string;
  transactionId?: string;
  responseCode: string;
  responseMessage?: string;
  status: 'SUCCESS' | 'FAILED' | 'PENDING';
  paymentMethod?: string;
  bankTransactionId?: string;
  cardType?: string;
  cardNumber?: string;
  amount?: string;
}

export interface SettlementReportParams {
  date: string;
}

export interface SettlementReport {
  date: string;
  transactions: Array<{
    orderId: string;
    transactionId: string;
    amount: string;
    status: string;
  }>;
  totalAmount: string;
  totalCount: number;
}

export enum PaymentGatewayType {
  ZAAKPAY = 'ZAAKPAY',
  RAZORPAY = 'RAZORPAY',
  STRIPE = 'STRIPE',
  PAYTM = 'PAYTM',
  PHONEPE = 'PHONEPE',
}
