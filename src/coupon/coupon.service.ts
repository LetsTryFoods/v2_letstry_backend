import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Coupon, CouponDocument, DiscountType } from './coupon.schema';

@Injectable()
export class CouponService {
  constructor(
    @InjectModel(Coupon.name) private couponModel: Model<CouponDocument>,
  ) {}

  async createCoupon(input: any): Promise<Coupon> {
    const existingCoupon = await this.couponModel.findOne({ code: input.code });
    if (existingCoupon) {
      throw new BadRequestException('Coupon with this code already exists');
    }
    const coupon = new this.couponModel(input);
    return coupon.save();
  }

  async getCouponByCode(code: string): Promise<Coupon> {
    const coupon = await this.couponModel.findOne({ code });
    if (!coupon) {
      throw new NotFoundException('Coupon not found');
    }
    return coupon;
  }

  async validateCoupon(code: string, cartTotal: number): Promise<Coupon> {
    const coupon = await this.getCouponByCode(code);
    
    this.validateStatus(coupon);
    this.validateValidityPeriod(coupon);
    this.validateUsageLimit(coupon);
    this.validateEligibility(coupon, cartTotal);

    return coupon;
  }

  private validateStatus(coupon: Coupon): void {
    if (!coupon.isActive) {
      throw new BadRequestException('Coupon is not active');
    }
  }

  private validateValidityPeriod(coupon: Coupon): void {
    const now = new Date();
    if (now < coupon.startDate || now > coupon.endDate) {
      throw new BadRequestException('Coupon is expired or not yet valid');
    }
  }

  private validateUsageLimit(coupon: Coupon): void {
    if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
      throw new BadRequestException('Coupon usage limit reached');
    }
  }

  private validateEligibility(coupon: Coupon, cartTotal: number): void {
    if (coupon.minCartValue && cartTotal < coupon.minCartValue) {
      throw new BadRequestException(`Minimum cart value of ${coupon.minCartValue} required`);
    }
  }

  async incrementUsageCount(code: string): Promise<void> {
    await this.couponModel.updateOne({ code }, { $inc: { usageCount: 1 } });
  }

  async getAllCoupons(): Promise<Coupon[]> {
    return this.couponModel.find().sort({ createdAt: -1 }).exec();
  }

  async getActiveCoupons(): Promise<Coupon[]> {
    const now = new Date();
    return this.couponModel.find({
      isActive: true,
      startDate: { $lte: now },
      endDate: { $gte: now },
      $or: [
        { usageLimit: { $exists: false } },
        { usageLimit: null },
        { $expr: { $lt: ['$usageCount', '$usageLimit'] } }
      ]
    }).sort({ createdAt: -1 }).exec();
  }
}
