import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CouponService } from './coupon.service';
import { CouponResolver } from './coupon.resolver';
import { Coupon, CouponSchema } from './coupon.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Coupon.name, schema: CouponSchema }]),
  ],
  providers: [CouponService, CouponResolver],
  exports: [CouponService],
})
export class CouponModule {}
