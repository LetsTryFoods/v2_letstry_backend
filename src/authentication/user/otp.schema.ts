import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type OtpDocument = Otp & Document;

@Schema()
export class Otp {
  @Prop({ required: true })
  phoneNumber: string;

  @Prop({ required: true })
  code: string;

  @Prop({ required: true })
  expiresAt: Date;

  @Prop({ default: false })
  isVerified: boolean;

  @Prop({ default: 0 })
  attempts: number;

  @Prop({ default: Date.now })
  createdAt: Date;
}

export const OtpSchema = SchemaFactory.createForClass(Otp);

OtpSchema.index({ phoneNumber: 1 });
OtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
