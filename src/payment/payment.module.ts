import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { PaymentEvent, PaymentEventSchema } from './payment.schema';
import { PaymentOrder, PaymentOrderSchema } from './payment.schema';
import { Ledger, LedgerSchema } from './payment.schema';
import { PaymentRefund, PaymentRefundSchema } from './payment.schema';
import {
  PaymentReconciliation,
  PaymentReconciliationSchema,
} from './payment.schema';
import { Order, OrderSchema } from './order/order.schema';
import { Identity, IdentitySchema } from '../common/schemas/identity.schema';
import { PaymentService } from './payment.service';
import { PaymentResolver } from './payment.resolver';
import { PaymentController } from './payment.controller';
import { PaymentExecutorService } from './payment-executor.service';
import { ZaakpayService } from './zaakpay.service';
import { LedgerService } from './ledger.service';
import { RefundService } from './refund.service';
import { OrderService } from './order/order.service';
import { OrderResolver } from './order/order.resolver';
import { PaymentLoggerService } from './payment-logger.service';
import { PaymentGatewayFactory } from './payment-gateway.factory';
import { CartModule } from '../cart/cart.module';
import { SseService } from './sse/sse.service';
import { SseController } from './sse/sse.controller';
import { SseLoggerService } from './sse/sse-logger.service';
import { WebhookLoggerService } from './webhook-logger.service';
import { OrderCartLoggerService } from './order-cart-logger.service';

@Module({
  imports: [
    ConfigModule,
    CartModule,
    EventEmitterModule.forRoot(),
    MongooseModule.forFeature([
      { name: PaymentEvent.name, schema: PaymentEventSchema },
      { name: PaymentOrder.name, schema: PaymentOrderSchema },
      { name: Ledger.name, schema: LedgerSchema },
      { name: PaymentRefund.name, schema: PaymentRefundSchema },
      { name: PaymentReconciliation.name, schema: PaymentReconciliationSchema },
      { name: Order.name, schema: OrderSchema },
      { name: Identity.name, schema: IdentitySchema },
    ]),
  ],
  controllers: [PaymentController, SseController],
  providers: [
    PaymentService,
    PaymentResolver,
    PaymentExecutorService,
    ZaakpayService,
    LedgerService,
    RefundService,
    OrderService,
    OrderResolver,
    PaymentLoggerService,
    PaymentGatewayFactory,
    SseService,
    SseLoggerService,
    WebhookLoggerService,
    OrderCartLoggerService,
  ],
  exports: [PaymentService, OrderService],
})
export class PaymentModule {}
