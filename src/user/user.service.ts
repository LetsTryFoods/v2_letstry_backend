import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from './user.schema';
import {
  Identity,
  IdentityDocument,
  IdentityStatus,
} from '../common/schemas/identity.schema';
import { Role } from '../common/enums/role.enum';
import { v4 as uuidv4 } from 'uuid';
import { GetCustomersInput, CustomerPlatform } from './user.input';
import {
  PaginatedCustomersResponse,
  CustomerSummary,
  PlatformStats,
  StatusStats,
  EnrichedCustomer,
  CustomerDetails,
} from './user.graphql';
import { PaginationMeta } from '../common/pagination';
import { Order } from '../payment/order/order.schema';
import { Cart, CartStatus } from '../cart/cart.schema';
import { Address } from '../address/address.schema';

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
  constructor(
    @InjectModel(Identity.name) private identityModel: Model<IdentityDocument>,
    @InjectModel(Order.name) private orderModel: Model<Order>,
    @InjectModel(Cart.name) private cartModel: Model<Cart>,
    @InjectModel(Address.name) private addressModel: Model<Address>,
  ) {}

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
    const identity = await this.identityModel
      .findOne({
        _id: id,
        status: {
          $in: [
            IdentityStatus.REGISTERED,
            IdentityStatus.VERIFIED,
            IdentityStatus.ACTIVE,
          ],
        },
      })
      .exec();
    return identity ? this.mapToUser(identity) : null;
  }

  async findByPhoneNumber(phoneNumber: string): Promise<User | null> {
    const identity = await this.identityModel
      .findOne({
        phoneNumber,
        status: {
          $in: [
            IdentityStatus.REGISTERED,
            IdentityStatus.VERIFIED,
            IdentityStatus.ACTIVE,
          ],
        },
      })
      .exec();
    return identity ? this.mapToUser(identity) : null;
  }

  async addMergedGuestId(userId: string, guestId: string): Promise<void> {
    await this.identityModel
      .findByIdAndUpdate(
        userId,
        { $addToSet: { mergedGuestIds: guestId } },
        { new: true },
      )
      .exec();
  }

  async getAllCustomers(
    input: GetCustomersInput,
  ): Promise<PaginatedCustomersResponse> {
    const filter = this.buildCustomerFilter(input);
    const page = input.page || 1;
    const limit = input.limit || 10;
    const skip = (page - 1) * limit;

    const [allCustomers, summary] = await Promise.all([
      this.fetchAllCustomers(filter),
      this.getCustomerSummary(),
    ]);

    let enrichedCustomers =
      await this.enrichCustomersWithOrderData(allCustomers);

    enrichedCustomers = this.applySpendingFilter(enrichedCustomers, input);
    enrichedCustomers = this.applySorting(enrichedCustomers, input);

    const totalCount = enrichedCustomers.length;
    const paginatedCustomers = enrichedCustomers.slice(skip, skip + limit);

    const meta = this.buildPaginationMeta(totalCount, page, limit);

    return { customers: paginatedCustomers, meta, summary };
  }

  async getCustomerDetails(id: string): Promise<CustomerDetails> {
    const customer = await this.findCustomerById(id);

    const customerId = customer._id.toString();
    const [orders, activeCart, addresses, orderStats] = await Promise.all([
      this.fetchCustomerOrders(customerId),
      this.fetchActiveCart(customerId),
      this.fetchCustomerAddresses(customerId),
      this.calculateOrderStats(customerId),
    ]);

    return {
      ...customer.toObject(),
      totalOrders: orderStats.totalOrders,
      totalSpent: orderStats.totalSpent,
      isGuest: customer.status === IdentityStatus.GUEST,
      orders,
      activeCart,
      addresses,
    };
  }

  private async findCustomerById(id: string): Promise<IdentityDocument> {
    const customer = await this.identityModel.findById(id).exec();

    if (!customer) {
      throw new NotFoundException(`Customer with ID ${id} not found`);
    }

    return customer;
  }

  private async fetchCustomerOrders(identityId: string): Promise<Order[]> {
    return this.orderModel.find({ identityId }).sort({ createdAt: -1 }).exec();
  }

  private async fetchActiveCart(identityId: string): Promise<Cart | undefined> {
    const cart = await this.cartModel
      .findOne({ identityId, status: CartStatus.ACTIVE })
      .exec();

    return cart || undefined;
  }

  private async fetchCustomerAddresses(identityId: string): Promise<Address[]> {
    return this.addressModel
      .find({ identityId })
      .sort({ isDefault: -1, createdAt: -1 })
      .exec();
  }

  private async calculateOrderStats(
    identityId: string,
  ): Promise<{ totalOrders: number; totalSpent: number }> {
    const stats = await this.orderModel.aggregate([
      { $match: { identityId } },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalSpent: { $sum: { $toDouble: '$totalAmount' } },
        },
      },
    ]);

    return stats.length > 0
      ? { totalOrders: stats[0].totalOrders, totalSpent: stats[0].totalSpent }
      : { totalOrders: 0, totalSpent: 0 };
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

    if (input.startDate || input.endDate) {
      filter.createdAt = {};
      if (input.startDate) {
        filter.createdAt.$gte = input.startDate;
      }
      if (input.endDate) {
        filter.createdAt.$lte = input.endDate;
      }
    }

    return filter;
  }

  private async fetchAllCustomers(filter: any): Promise<IdentityDocument[]> {
    return this.identityModel.find(filter).exec();
  }

  private async fetchCustomers(
    filter: any,
    skip: number,
    limit: number,
  ): Promise<IdentityDocument[]> {
    return this.identityModel
      .find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec();
  }

  private applySpendingFilter(
    customers: any[],
    input: GetCustomersInput,
  ): any[] {
    let filtered = customers;

    if (input.minSpent !== undefined) {
      filtered = filtered.filter((c) => c.totalSpent >= input.minSpent!);
    }

    if (input.maxSpent !== undefined) {
      filtered = filtered.filter((c) => c.totalSpent <= input.maxSpent!);
    }

    return filtered;
  }

  private applySorting(customers: any[], input: GetCustomersInput): any[] {
    if (!input.sortBy) {
      return customers.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
    }

    const order = input.sortOrder === 'ASC' ? 1 : -1;

    return customers.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (input.sortBy) {
        case 'TOTAL_SPENT':
          aValue = a.totalSpent || 0;
          bValue = b.totalSpent || 0;
          break;
        case 'TOTAL_ORDERS':
          aValue = a.totalOrders || 0;
          bValue = b.totalOrders || 0;
          break;
        case 'LAST_ACTIVE':
          aValue = a.lastActiveAt ? new Date(a.lastActiveAt).getTime() : 0;
          bValue = b.lastActiveAt ? new Date(b.lastActiveAt).getTime() : 0;
          break;
        case 'CREATED_AT':
        default:
          aValue = new Date(a.createdAt).getTime();
          bValue = new Date(b.createdAt).getTime();
          break;
      }

      return (aValue - bValue) * order;
    });
  }

  private async countCustomers(filter: any): Promise<number> {
    return this.identityModel.countDocuments(filter).exec();
  }

  private async getCustomerSummary(): Promise<CustomerSummary> {
    const [platformStats, statusStats, totalCounts, revenue, newUsers] =
      await Promise.all([
        this.getPlatformStats(),
        this.getStatusStats(),
        this.getTotalCounts(),
        this.getTotalRevenue(),
        this.getNewUsersThisMonth(),
      ]);

    return {
      totalCustomers: totalCounts.total,
      totalGuests: totalCounts.guests,
      totalRegistered: totalCounts.registered,
      totalRevenue: revenue,
      newThisMonth: newUsers,
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

  private async countByPlatform(
    baseFilter: any,
    platform: CustomerPlatform,
  ): Promise<number> {
    return this.identityModel
      .countDocuments({
        ...baseFilter,
        'signupSource.platform': platform,
      })
      .exec();
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

  private async countByStatus(
    baseFilter: any,
    status: IdentityStatus,
  ): Promise<number> {
    return this.identityModel
      .countDocuments({
        ...baseFilter,
        status,
      })
      .exec();
  }

  private async getTotalCounts(): Promise<{
    total: number;
    guests: number;
    registered: number;
  }> {
    const baseFilter = { role: { $in: [Role.USER, Role.GUEST] } };

    const [total, guests, registered] = await Promise.all([
      this.identityModel.countDocuments(baseFilter).exec(),
      this.identityModel
        .countDocuments({ ...baseFilter, status: IdentityStatus.GUEST })
        .exec(),
      this.identityModel
        .countDocuments({
          ...baseFilter,
          status: {
            $in: [
              IdentityStatus.REGISTERED,
              IdentityStatus.VERIFIED,
              IdentityStatus.ACTIVE,
            ],
          },
        })
        .exec(),
    ]);

    return { total, guests, registered };
  }

  private async getTotalRevenue(): Promise<number> {
    const result = await this.orderModel.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: { $toDouble: '$totalAmount' } },
        },
      },
    ]);

    return result.length > 0 ? Math.round(result[0].total) : 0;
  }

  private async getNewUsersThisMonth(): Promise<number> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    return this.identityModel
      .countDocuments({
        role: { $in: [Role.USER, Role.GUEST] },
        createdAt: { $gte: startOfMonth },
      })
      .exec();
  }

  private buildPaginationMeta(
    totalCount: number,
    page: number,
    limit: number,
  ): PaginationMeta {
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

  private async enrichCustomersWithOrderData(
    customers: IdentityDocument[],
  ): Promise<EnrichedCustomer[]> {
    const identityIds = customers.map((c) => c._id.toString());

    const [orderStats, cartStats] = await Promise.all([
      this.getOrderStatsForCustomers(identityIds),
      this.getCartStatsForCustomers(identityIds),
    ]);

    return customers.map((customer) => {
      const customerId = customer._id.toString();
      const orderStat = orderStats.get(customerId) || {
        totalOrders: 0,
        totalSpent: 0,
      };
      const cartStat = cartStats.get(customerId);

      return {
        ...customer.toObject(),
        totalOrders: orderStat.totalOrders,
        totalSpent: orderStat.totalSpent,
        activeCartItemsCount: cartStat?.itemsCount,
        displayPhone: this.getDisplayPhone(customer),
        isGuest: customer.status === IdentityStatus.GUEST,
      };
    });
  }

  private async getOrderStatsForCustomers(
    identityIds: string[],
  ): Promise<Map<string, { totalOrders: number; totalSpent: number }>> {
    const stats = await this.orderModel.aggregate([
      { $match: { identityId: { $in: identityIds } } },
      {
        $group: {
          _id: '$identityId',
          totalOrders: { $sum: 1 },
          totalSpent: { $sum: { $toDouble: '$totalAmount' } },
        },
      },
    ]);

    return new Map(
      stats.map((stat) => [
        stat._id,
        { totalOrders: stat.totalOrders, totalSpent: stat.totalSpent },
      ]),
    );
  }

  private async getCartStatsForCustomers(
    identityIds: string[],
  ): Promise<Map<string, { itemsCount: number }>> {
    const carts = await this.cartModel
      .find({
        identityId: { $in: identityIds },
        status: CartStatus.ACTIVE,
      })
      .select('identityId items')
      .exec();

    return new Map(
      carts.map((cart) => [cart.identityId, { itemsCount: cart.items.length }]),
    );
  }

  private getDisplayPhone(customer: IdentityDocument): string | undefined {
    if (customer.phoneNumber) {
      return customer.phoneNumber;
    }
    return undefined;
  }

  async updateUserActivity(userId: string): Promise<boolean> {
    const result = await this.identityModel
      .updateOne(
        {
          _id: userId,
          status: {
            $in: [
              IdentityStatus.REGISTERED,
              IdentityStatus.VERIFIED,
              IdentityStatus.ACTIVE,
            ],
          },
        },
        { lastActiveAt: new Date() },
      )
      .exec();

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
