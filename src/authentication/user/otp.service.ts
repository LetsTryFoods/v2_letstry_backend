import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Otp, OtpDocument } from './otp.schema';

@Injectable()
export class OtpService {
  private readonly OTP_EXPIRY_MINUTES = 10;
  private readonly MAX_ATTEMPTS = 5;

  constructor(
    @InjectModel(Otp.name) private otpModel: Model<OtpDocument>,
  ) {}

  generateOtpCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  async createOtp(phoneNumber: string): Promise<string> {
    const code = this.generateOtpCode();
    const expiresAt = new Date(Date.now() + this.OTP_EXPIRY_MINUTES * 60 * 1000);

    await this.otpModel.deleteMany({ phoneNumber, isVerified: false });

    await this.otpModel.create({
      phoneNumber,
      code,
      expiresAt,
      isVerified: false,
      attempts: 0,
    });

    return code;
  }

  async verifyOtp(phoneNumber: string, code: string): Promise<boolean> {
    const otp = await this.otpModel.findOne({
      phoneNumber,
      isVerified: false,
      expiresAt: { $gt: new Date() },
    });

    if (!otp) {
      return false;
    }

    if (otp.attempts >= this.MAX_ATTEMPTS) {
      await this.otpModel.deleteOne({ _id: otp._id });
      return false;
    }

    otp.attempts += 1;
    await otp.save();

    if (otp.code !== code) {
      return false;
    }

    otp.isVerified = true;
    await otp.save();

    return true;
  }

  async cleanupExpiredOtps(): Promise<void> {
    await this.otpModel.deleteMany({
      expiresAt: { $lt: new Date() },
    });
  }
}
