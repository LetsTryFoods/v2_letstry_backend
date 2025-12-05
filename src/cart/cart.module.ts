import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Cart, CartSchema } from './cart.schema';
import { CartService } from './cart.service';
import { CartResolver } from './cart.resolver';
import { ProductModule } from '../product/product.module';
import { LoggerModule } from '../logger/logger.module';
import { CouponModule } from '../coupon/coupon.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Cart.name, schema: CartSchema }]),
    ProductModule,
    LoggerModule,
    CouponModule,
  ],
  providers: [CartService, CartResolver],
  exports: [CartService],
})
export class CartModule {}
