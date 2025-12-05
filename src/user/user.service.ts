import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './user.schema';
import { Role } from '../common/enums/role.enum';

export interface CreateUserData {
  phoneNumber: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  marketing_sms_opt_in?: boolean;
  signup_source?: any;
  last_ip?: string;
  role?: Role;
}

@Injectable()
export class UserService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  async createUser(data: CreateUserData): Promise<UserDocument> {
    const user = new this.userModel({
      ...data,
      created_at: new Date(),
      marketing_sms_opt_in: data.marketing_sms_opt_in ?? false,
      role: data.role || Role.USER,
    });
    return await user.save();
  }

  async findById(id: string): Promise<UserDocument | null> {
    return this.userModel.findById(id).exec();
  }
}