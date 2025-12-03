import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { Admin, AdminDocument } from './admin.schema';

@Injectable()
export class AdminService {
  constructor(
    @InjectModel(Admin.name) private adminModel: Model<AdminDocument>,
  ) {}

  async create(admin: Partial<Admin>): Promise<Admin> {
    if (!admin.password) {
      throw new Error('Password is required');
    }
    const hashedPassword = await bcrypt.hash(admin.password, 10);
    const createdAdmin = new this.adminModel({
      ...admin,
      password: hashedPassword,
    });
    return createdAdmin.save();
  }

  async findByEmail(email: string): Promise<AdminDocument | null> {
    return this.adminModel.findOne({ email }).exec();
  }

  async validatePassword(
    password: string,
    hashedPassword: string,
  ): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  }
}
