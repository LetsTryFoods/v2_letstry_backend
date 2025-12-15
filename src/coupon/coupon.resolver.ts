import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { CouponService } from './coupon.service';
import { Coupon } from './coupon.schema';
import { JwtAuthGuard } from '../authentication/common/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { Role } from '../common/enums/role.enum';
import { CreateCouponInput } from './coupon.input';
import { Public } from '../common/decorators/public.decorator';

@Resolver(() => Coupon)
export class CouponResolver {
  constructor(private readonly couponService: CouponService) {}

  @Mutation(() => Coupon)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async createCoupon(@Args('input') input: CreateCouponInput): Promise<Coupon> {
    return this.couponService.createCoupon(input);
  }

  @Query(() => Coupon, { name: 'coupon' })
  @Public()
  async getCoupon(@Args('code') code: string): Promise<Coupon> {
    return this.couponService.getCouponByCode(code);
  }

  @Query(() => [Coupon], { name: 'coupons' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Roles(Role.ADMIN)
  async getAllCoupons(): Promise<Coupon[]> {
    return this.couponService.getAllCoupons();
  }

  @Query(() => [Coupon], { name: 'activeCoupons' })
  @Public()
  async getActiveCoupons(): Promise<Coupon[]> {
    return this.couponService.getActiveCoupons();
  }
}
