import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from './user.schema';
import { Identity, IdentityDocument, IdentityStatus } from '../common/schemas/identity.schema';
import { Role } from '../common/enums/role.enum';
import { v4 as uuidv4 } from 'uuid';

export interface CreateUserData {
  phoneNumber: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  marketingSmsOptIn?: boolean;
  signupSource?: any;
  lastIp?: string;
  role?: Role;
}

@Injectable()
export class UserService {
  constructor(@InjectModel(Identity.name) private identityModel: Model<IdentityDocument>) {}

  async createUser(data: CreateUserData): Promise<User> {
    const identityId = uuidv4();
    const identity = await this.identityModel.create({
      ...data,
      identityId,
      status: IdentityStatus.REGISTERED,
      role: data.role || Role.USER,
      marketingSmsOptIn: data.marketingSmsOptIn ?? false,
      isPhoneVerified: false,
      mergedGuestIds: [],
    });
    return this.mapToUser(identity);
  }

  async findById(id: string): Promise<User | null> {
    const identity = await this.identityModel.findOne({
      _id: id,
      status: { $in: [IdentityStatus.REGISTERED, IdentityStatus.VERIFIED, IdentityStatus.ACTIVE] }
    }).exec();
    return identity ? this.mapToUser(identity) : null;
  }

  async findByPhoneNumber(phoneNumber: string): Promise<User | null> {
    const identity = await this.identityModel.findOne({
      phoneNumber,
      status: { $in: [IdentityStatus.REGISTERED, IdentityStatus.VERIFIED, IdentityStatus.ACTIVE] }
    }).exec();
    return identity ? this.mapToUser(identity) : null;
  }

  async addMergedGuestId(userId: string, guestId: string): Promise<void> {
    await this.identityModel.findByIdAndUpdate(
      userId,
      { $addToSet: { mergedGuestIds: guestId } },
      { new: true }
    ).exec();
  }

  private mapToUser(identity: IdentityDocument): User {
    return {
      _id: identity._id.toString(),
      phoneNumber: identity.phoneNumber || '',
      firstName: identity.firstName || '',
      lastName: identity.lastName || '',
      email: identity.email,
      createdAt: identity.createdAt,
      updatedAt: identity.updatedAt,
      lastLoginAt: identity.lastLoginAt,
      lifetimeValue: identity.lifetimeValue,
      marketingSmsOptIn: identity.marketingSmsOptIn,
      signupSource: identity.signupSource,
      lastIp: identity.lastIp || '',
      role: identity.role as Role,
      isPhoneVerified: identity.isPhoneVerified,
      mergedGuestIds: identity.mergedGuestIds,
    };
  }
}