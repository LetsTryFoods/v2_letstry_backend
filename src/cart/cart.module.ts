import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Cart, CartSchema } from './cart.schema';
import { Identity, IdentitySchema } from '../common/schemas/identity.schema';
import { CartService } from './cart.service';
import { CartResolver } from './cart.resolver';
import { ProductModule } from '../product/product.module';
import { LoggerModule } from '../logger/logger.module';
import { CouponModule } from '../coupon/coupon.module';
import { ChargesModule } from '../charges/charges.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Cart.name, schema: CartSchema },
      { name: Identity.name, schema: IdentitySchema }
    ]),
    ProductModule,
    LoggerModule,
    CouponModule,
    ChargesModule,
  ],
  providers: [CartService, CartResolver],
  exports: [CartService],
})
export class CartModule {}
