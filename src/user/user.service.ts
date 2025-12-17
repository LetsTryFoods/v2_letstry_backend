import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from './user.schema';
import { Identity, IdentityDocument, IdentityStatus } from '../common/schemas/identity.schema';
import { Role } from '../common/enums/role.enum';
import { v4 as uuidv4 } from 'uuid';
import { GetCustomersInput, CustomerPlatform } from './user.input';
import { PaginatedCustomersResponse, CustomerSummary, PlatformStats, StatusStats } from './user.graphql';
import { PaginationMeta } from '../common/pagination';

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

  async getAllCustomers(input: GetCustomersInput): Promise<PaginatedCustomersResponse> {
    const filter = this.buildCustomerFilter(input);
    const page = input.page || 1;
    const limit = input.limit || 10;
    const skip = (page - 1) * limit;

    const [customers, totalCount, summary] = await Promise.all([
      this.fetchCustomers(filter, skip, limit),
      this.countCustomers(filter),
      this.getCustomerSummary(),
    ]);

    const meta = this.buildPaginationMeta(totalCount, page, limit);

    return { customers, meta, summary };
  }

  private buildCustomerFilter(input: GetCustomersInput): any {
    const filter: any = {
      role: { $in: [Role.USER, Role.GUEST] },
    };

    if (input.status) {
      filter.status = input.status;
    }

    if (input.platform) {
      filter['signupSource.platform'] = input.platform;
    }

    if (input.searchTerm) {
      filter.$or = [
        { phoneNumber: { $regex: input.searchTerm, $options: 'i' } },
        { email: { $regex: input.searchTerm, $options: 'i' } },
        { firstName: { $regex: input.searchTerm, $options: 'i' } },
        { lastName: { $regex: input.searchTerm, $options: 'i' } },
      ];
    }

    return filter;
  }

  private async fetchCustomers(filter: any, skip: number, limit: number): Promise<Identity[]> {
    return this.identityModel
      .find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec();
  }

  private async countCustomers(filter: any): Promise<number> {
    return this.identityModel.countDocuments(filter).exec();
  }

  private async getCustomerSummary(): Promise<CustomerSummary> {
    const [platformStats, statusStats, totalCounts] = await Promise.all([
      this.getPlatformStats(),
      this.getStatusStats(),
      this.getTotalCounts(),
    ]);

    return {
      totalCustomers: totalCounts.total,
      totalGuests: totalCounts.guests,
      totalRegistered: totalCounts.registered,
      platformStats,
      statusStats,
    };
  }

  private async getPlatformStats(): Promise<PlatformStats> {
    const baseFilter = { role: { $in: [Role.USER, Role.GUEST] } };

    const [android, ios, web] = await Promise.all([
      this.countByPlatform(baseFilter, CustomerPlatform.ANDROID),
      this.countByPlatform(baseFilter, CustomerPlatform.IOS),
      this.countByPlatform(baseFilter, CustomerPlatform.WEB),
    ]);

    return { android, ios, web };
  }

  private async countByPlatform(baseFilter: any, platform: CustomerPlatform): Promise<number> {
    return this.identityModel.countDocuments({
      ...baseFilter,
      'signupSource.platform': platform,
    }).exec();
  }

  private async getStatusStats(): Promise<StatusStats> {
    const baseFilter = { role: { $in: [Role.USER, Role.GUEST] } };

    const [guest, registered, verified, active, suspended] = await Promise.all([
      this.countByStatus(baseFilter, IdentityStatus.GUEST),
      this.countByStatus(baseFilter, IdentityStatus.REGISTERED),
      this.countByStatus(baseFilter, IdentityStatus.VERIFIED),
      this.countByStatus(baseFilter, IdentityStatus.ACTIVE),
      this.countByStatus(baseFilter, IdentityStatus.SUSPENDED),
    ]);

    return { guest, registered, verified, active, suspended };
  }

  private async countByStatus(baseFilter: any, status: IdentityStatus): Promise<number> {
    return this.identityModel.countDocuments({
      ...baseFilter,
      status,
    }).exec();
  }

  private async getTotalCounts(): Promise<{ total: number; guests: number; registered: number }> {
    const baseFilter = { role: { $in: [Role.USER, Role.GUEST] } };

    const [total, guests, registered] = await Promise.all([
      this.identityModel.countDocuments(baseFilter).exec(),
      this.identityModel.countDocuments({ ...baseFilter, status: IdentityStatus.GUEST }).exec(),
      this.identityModel.countDocuments({
        ...baseFilter,
        status: { $in: [IdentityStatus.REGISTERED, IdentityStatus.VERIFIED, IdentityStatus.ACTIVE] },
      }).exec(),
    ]);

    return { total, guests, registered };
  }

  private buildPaginationMeta(totalCount: number, page: number, limit: number): PaginationMeta {
    const totalPages = Math.ceil(totalCount / limit);

    return {
      totalCount,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    };
  }

  async updateUserActivity(userId: string): Promise<boolean> {
    const result = await this.identityModel.updateOne(
      { 
        _id: userId,
        status: { $in: [IdentityStatus.REGISTERED, IdentityStatus.VERIFIED, IdentityStatus.ACTIVE] }
      },
      { lastActiveAt: new Date() }
    ).exec();

    return result.modifiedCount > 0;
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