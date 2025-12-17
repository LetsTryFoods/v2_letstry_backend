import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PaymentOrder, PaymentStatus } from './payment.schema';
import { ZaakpayService } from './zaakpay.service';
import { LedgerService } from './ledger.service';
import { PaymentLoggerService } from './payment-logger.service';
import { OrderService } from './order/order.service';
import { CartService } from '../cart/cart.service';
import { OrderCartLoggerService } from './order-cart-logger.service';

@Injectable()
export class PaymentExecutorService {
  constructor(
    @InjectModel(PaymentOrder.name)
    private paymentOrderModel: Model<PaymentOrder>,
    private zaakpayService: ZaakpayService,
    private ledgerService: LedgerService,
    private paymentLogger: PaymentLoggerService,
    private orderService: OrderService,
    private cartService: CartService,
    private orderCartLogger: OrderCartLoggerService,
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
    paymentMode?: string;
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
      paymentMode: params.paymentMode,
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

    await this.createOrderAndClearCart(paymentOrder);

    this.paymentLogger.logPaymentSuccess({
      paymentOrderId: params.paymentOrderId,
      zaakpayTxnId: params.zaakpayTxnId,
      amount: paymentOrder.amount,
    });
  }

  private async createOrderAndClearCart(paymentOrder: any): Promise<void> {
    const paymentEvent = await this.getPaymentEvent(paymentOrder.paymentEventId);
    
    if (!paymentEvent) {
      this.paymentLogger.error('Payment event not found', '', { paymentOrderId: paymentOrder.paymentOrderId });
      this.orderCartLogger.logPaymentEventNotFound(paymentOrder.paymentOrderId);
      return;
    }

    const cart = await this.getCartDetails(paymentEvent.cartId);
    
    if (!cart) {
      this.paymentLogger.error('Cart not found', '', { cartId: paymentEvent.cartId });
      this.orderCartLogger.logCartNotFound(paymentEvent.cartId.toString());
      return;
    }

    try {
      this.orderCartLogger.logOrderCreationStart(
        paymentOrder.paymentOrderId,
        paymentEvent.cartId.toString()
      );

      const order = await this.orderService.createOrder({
        identityId: paymentOrder.identityId.toString(),
        paymentOrderId: paymentOrder.paymentOrderId,
        cartId: paymentEvent.cartId.toString(),
        totalAmount: paymentOrder.amount,
        currency: paymentOrder.currency,
        shippingAddressId: cart.shippingAddressId?.toString(),
        items: cart.items.map((item: any) => ({
          productId: item.productId?.toString() || item.productId,
          quantity: item.quantity || 0,
          price: (item.unitPrice || item.price || 0).toString(),
          totalPrice: item.totalPrice?.toString() || (item.quantity * (item.unitPrice || item.price || 0)).toString(),
          name: item.name || 'Unknown Product',
          sku: item.sku || 'N/A',
        })),
      });

      this.orderCartLogger.logOrderCreated(
        order.orderId,
        paymentOrder.paymentOrderId,
        cart.items.length,
        paymentOrder.amount
      );

      this.orderCartLogger.logCartClearStart(
        paymentOrder.identityId.toString(),
        paymentEvent.cartId.toString()
      );

      await this.cartService.clearCart(paymentOrder.identityId.toString());

      this.orderCartLogger.logCartCleared(
        paymentOrder.identityId.toString(),
        cart.items.length
      );
    } catch (error) {
      this.orderCartLogger.logOrderCreationError(error.message, {
        paymentOrderId: paymentOrder.paymentOrderId,
        cartId: paymentEvent.cartId.toString(),
        stack: error.stack,
      });
      throw error;
    }
  }

  private async getPaymentEvent(paymentEventId: any): Promise<any> {
    const PaymentEvent = this.paymentOrderModel.db.model('PaymentEvent');
    return PaymentEvent.findById(paymentEventId);
  }

  private async getCartDetails(cartId: any): Promise<any> {
    const Cart = this.paymentOrderModel.db.model('Cart');
    return Cart.findById(cartId);
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

    const zaakpayStatus = await this.zaakpayService.checkTransactionStatus({
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
}
