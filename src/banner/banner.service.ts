import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Banner, BannerDocument } from './banner.schema';
import { CreateBannerInput, UpdateBannerInput } from './banner.input';

@Injectable()
export class BannerService {
  constructor(
    @InjectModel(Banner.name) private bannerModel: Model<BannerDocument>,
  ) {}

  async create(createBannerInput: CreateBannerInput): Promise<Banner> {
    const createdBanner = new this.bannerModel(createBannerInput);
    return createdBanner.save();
  }

  async findAll(): Promise<Banner[]> {
    const data = (await this.bannerModel
      .find()
      .sort({ position: 1 })
      .lean()
      .exec()) as unknown as Banner[];
    return data;
  }

  async findOne(id: string): Promise<Banner> {
    const banner = (await this.bannerModel
      .findById(id)
      .lean()
      .exec()) as unknown as Banner | null;
    if (!banner) {
      throw new NotFoundException(`Banner with ID ${id} not found`);
    }
    return banner;
  }

  async findActive(): Promise<Banner[]> {
    const now = new Date();
    return this.bannerModel
      .find({
        isActive: true,
        $and: [
          {
            $or: [
              { startDate: { $lte: now } },
              { startDate: { $exists: false } },
              { startDate: null },
            ],
          },
          {
            $or: [
              { endDate: { $gte: now } },
              { endDate: { $exists: false } },
              { endDate: null },
            ],
          },
        ],
      })
      .sort({ position: 1 })
      .lean()
      .exec() as unknown as Banner[];
  }

  async update(
    id: string,
    updateBannerInput: UpdateBannerInput,
  ): Promise<Banner> {
    const banner = (await this.bannerModel
      .findByIdAndUpdate(id, updateBannerInput, { new: true })
      .lean()
      .exec()) as unknown as Banner | null;
    if (!banner) {
      throw new NotFoundException(`Banner with ID ${id} not found`);
    }
    return banner;
  }

  async remove(id: string): Promise<Banner> {
    const banner = (await this.bannerModel
      .findByIdAndDelete(id)
      .lean()
      .exec()) as unknown as Banner | null;
    if (!banner) {
      throw new NotFoundException(`Banner with ID ${id} not found`);
    }
    return banner;
  }
}
