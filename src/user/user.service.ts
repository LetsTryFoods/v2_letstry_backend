import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './user.schema';
import { Role } from '../common/enums/role.enum';

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
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  async createUser(data: CreateUserData): Promise<UserDocument> {
    const user = new this.userModel({
      ...data,
      marketingSmsOptIn: data.marketingSmsOptIn ?? false,
    });
    return await user.save();
  }

  async findById(id: string): Promise<UserDocument | null> {
    return this.userModel.findById(id).exec();
  }

  async findByPhoneNumber(phoneNumber: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ phoneNumber }).exec();
  }
}