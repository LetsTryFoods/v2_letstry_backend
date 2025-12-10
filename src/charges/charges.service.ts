import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Charges, ChargesDocument } from './charges.schema';

@Injectable()
export class ChargesService {
  private readonly logger = new Logger(ChargesService.name);

  constructor(
    @InjectModel(Charges.name) private chargesModel: Model<ChargesDocument>,
  ) {}

  async getCharges(): Promise<ChargesDocument | null> {
    return this.chargesModel.findOne({ active: true }).exec();
  }

  async createOrUpdateCharges(input: Partial<Charges>): Promise<ChargesDocument> {
    const existing = await this.chargesModel.findOne();
    if (existing) {
      Object.assign(existing, input);
      return existing.save();
    }
    const newCharges = new this.chargesModel(input);
    return newCharges.save();
  }
}
