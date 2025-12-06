import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Address, AddressDocument } from './address.schema';
import { CreateAddressInput, UpdateAddressInput } from './address.input';
import { WinstonLoggerService } from '../logger/logger.service';

@Injectable()
export class AddressService {
  constructor(
    @InjectModel(Address.name) private addressModel: Model<AddressDocument>,
    private readonly logger: WinstonLoggerService,
  ) {}

  async createAddress(userId: string, input: CreateAddressInput): Promise<AddressDocument> {
    this.logger.log('Creating address', { userId, input }, 'AddressModule');
    
    if (input.isDefault) {
      await this.addressModel.updateMany({ userId }, { isDefault: false });
    }

    const address = new this.addressModel({
      ...input,
      userId,
    });
    return address.save();
  }

  async getAddresses(userId: string): Promise<AddressDocument[]> {
    this.logger.log('Fetching addresses', { userId }, 'AddressModule');
    return this.addressModel.find({ userId }).sort({ isDefault: -1, createdAt: -1 }).exec();
  }

  async getAddress(id: string, userId: string): Promise<AddressDocument> {
    this.logger.log('Fetching address', { id, userId }, 'AddressModule');
    const address = await this.addressModel.findOne({ _id: id, userId }).exec();
    if (!address) {
      throw new NotFoundException('Address not found');
    }
    return address;
  }

  async updateAddress(id: string, userId: string, input: UpdateAddressInput): Promise<AddressDocument> {
    this.logger.log('Updating address', { id, userId, input }, 'AddressModule');
    
    const address = await this.getAddress(id, userId);

    if (input.isDefault) {
      await this.addressModel.updateMany({ userId }, { isDefault: false });
    }

    Object.assign(address, input);
    return address.save();
  }

  async deleteAddress(id: string, userId: string): Promise<AddressDocument> {
    this.logger.log('Deleting address', { id, userId }, 'AddressModule');
    const address = await this.addressModel.findOneAndDelete({ _id: id, userId }).exec();
    if (!address) {
      throw new NotFoundException('Address not found');
    }
    return address;
  }
}
