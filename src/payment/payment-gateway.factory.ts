import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ZaakpayService } from './zaakpay.service';
import { ZaakpayAdapter } from './adapters/zaakpay.adapter';
import { PaymentGatewayProvider, PaymentGatewayType } from './interfaces/payment-gateway.interface';

@Injectable()
export class PaymentGatewayFactory {
  private zaakpayAdapter: ZaakpayAdapter;

  constructor(
    private readonly configService: ConfigService,
    private readonly zaakpayService: ZaakpayService,
  ) {
    this.zaakpayAdapter = new ZaakpayAdapter(this.zaakpayService);
  }

  getProvider(gatewayType?: PaymentGatewayType): PaymentGatewayProvider {
    const selectedGateway = 
      gatewayType || 
      (this.configService.get<string>('payment.gateway') as PaymentGatewayType) ||
      PaymentGatewayType.ZAAKPAY;

    switch (selectedGateway) {
      case PaymentGatewayType.ZAAKPAY:
        return this.zaakpayAdapter;
      
      case PaymentGatewayType.RAZORPAY:
        throw new Error('Razorpay integration not implemented yet');
      
      case PaymentGatewayType.STRIPE:
        throw new Error('Stripe integration not implemented yet');
      
      case PaymentGatewayType.PAYTM:
        throw new Error('Paytm integration not implemented yet');
      
      case PaymentGatewayType.PHONEPE:
        throw new Error('PhonePe integration not implemented yet');
      
      default:
        return this.zaakpayAdapter;
    }
  }

  getCurrentGatewayType(): PaymentGatewayType {
    return (this.configService.get<string>('payment.gateway') as PaymentGatewayType) || 
           PaymentGatewayType.ZAAKPAY;
  }
}
