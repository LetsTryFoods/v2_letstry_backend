import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Address, AddressDocument } from './address.schema';
import { CreateAddressInput, UpdateAddressInput } from './address.input';
import { WinstonLoggerService } from '../logger/logger.service';
import { GoogleMapsService, GoogleMapsAddress } from './google-maps.service';
import { Identity, IdentityDocument, IdentityStatus } from '../common/schemas/identity.schema';

@Injectable()
export class AddressService {
  constructor(
    @InjectModel(Address.name) private addressModel: Model<AddressDocument>,
    @InjectModel(Identity.name) private identityModel: Model<IdentityDocument>,
    private readonly logger: WinstonLoggerService,
    private readonly googleMapsService: GoogleMapsService,
  ) {}

  async createAddress(identityId: string, input: CreateAddressInput): Promise<AddressDocument> {
    this.logger.log('Creating address', { identityId, input }, 'AddressModule');
    
    await this.validatePhoneNotRegistered(input.recipientPhone, identityId);
    
    if (input.isDefault) {
      await this.addressModel.updateMany({ identityId }, { isDefault: false });
    }

    const address = new this.addressModel({
      ...input,
      identityId,
    });
    return address.save();
  }

  async getAddresses(identityId: string): Promise<AddressDocument[]> {
    this.logger.log('Fetching addresses', { identityId }, 'AddressModule');
    return this.addressModel.find({ identityId }).sort({ isDefault: -1, createdAt: -1 }).exec();
  }

  async getAddress(id: string, identityId: string): Promise<AddressDocument> {
    this.logger.log('Fetching address', { id, identityId }, 'AddressModule');
    const address = await this.addressModel.findOne({ _id: id, identityId }).exec();
    if (!address) {
      throw new NotFoundException('Address not found');
    }
    return address;
  }

  async updateAddress(id: string, identityId: string, input: UpdateAddressInput): Promise<AddressDocument> {
    this.logger.log('Updating address', { id, identityId, input }, 'AddressModule');
    
    const address = await this.getAddress(id, identityId);

    if (input.isDefault) {
      await this.addressModel.updateMany({ identityId }, { isDefault: false });
    }

    Object.assign(address, input);
    return address.save();
  }

  async deleteAddress(id: string, identityId: string): Promise<AddressDocument> {
    this.logger.log('Deleting address', { id, identityId }, 'AddressModule');
    const address = await this.addressModel.findOneAndDelete({ _id: id, identityId }).exec();
    if (!address) {
      throw new NotFoundException('Address not found');
    }
    return address;
  }

  async geocodeAddress(address: string): Promise<GoogleMapsAddress> {
    this.logger.log('Geocoding address', { address }, 'AddressModule');
    return this.googleMapsService.geocodeAddress(address);
  }

  async reverseGeocode(latitude: number, longitude: number): Promise<GoogleMapsAddress> {
    this.logger.log('Reverse geocoding', { latitude, longitude }, 'AddressModule');
    return this.googleMapsService.reverseGeocode(latitude, longitude);
  }

  async searchPlaces(query: string, sessionToken?: string) {
    this.logger.log('Searching places', { query }, 'AddressModule');
    return this.googleMapsService.searchPlaces(query, sessionToken);
  }

  async getPlaceDetails(placeId: string, sessionToken?: string) {
    this.logger.log('Getting place details', { placeId }, 'AddressModule');
    return this.googleMapsService.getPlaceDetails(placeId, sessionToken);
  }

  async transferAddresses(guestIdentityId: string, userIdentityId: string): Promise<void> {
    this.logger.log('Transferring addresses', { guestIdentityId, userIdentityId }, 'AddressModule');
    
    const result = await this.addressModel.updateMany(
      { identityId: guestIdentityId },
      { identityId: userIdentityId }
    ).exec();
    
    this.logger.log('Addresses transferred', { count: result.modifiedCount }, 'AddressModule');
  }

  async checkPhoneExists(phoneNumber: string): Promise<{ exists: boolean; requiresLogin: boolean; message?: string }> {
    this.logger.log('Checking if phone exists', { phoneNumber }, 'AddressModule');
    
    const existingIdentity = await this.identityModel.findOne({
      phoneNumber,
      status: { $in: [IdentityStatus.REGISTERED, IdentityStatus.VERIFIED, IdentityStatus.ACTIVE] }
    }).exec();

    if (existingIdentity) {
      return {
        exists: true,
        requiresLogin: true,
        message: 'This phone number is already registered. Please login to continue.'
      };
    }

    return {
      exists: false,
      requiresLogin: false
    };
  }

  private async validatePhoneNotRegistered(phoneNumber: string, currentIdentityId: string): Promise<void> {
    const existingIdentity = await this.identityModel.findOne({
      phoneNumber,
      status: { $in: [IdentityStatus.REGISTERED, IdentityStatus.VERIFIED, IdentityStatus.ACTIVE] },
      _id: { $ne: currentIdentityId }
    }).exec();

    if (existingIdentity) {
      this.logger.warn('Attempted to create address with registered phone', { phoneNumber }, 'AddressModule');
      throw new BadRequestException({
        code: 'PHONE_ALREADY_REGISTERED',
        message: 'This phone number is already registered. Please login to continue.',
        requiresLogin: true
      });
    }
  }
}
