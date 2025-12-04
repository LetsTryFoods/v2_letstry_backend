import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Banner, BannerDocument } from './banner.schema';
import { CreateBannerInput, UpdateBannerInput } from './banner.input';
import { CacheService } from '../cache/cache.service';
import { CacheKeyFactory } from '../cache/cache-key.factory';
import { CacheInvalidatorService } from '../cache/cache-invalidator.service';


@Injectable()
export class BannerService {
  constructor(
    @InjectModel(Banner.name) private bannerModel: Model<BannerDocument>,
    private readonly cacheService: CacheService,
    private readonly cacheKeyFactory: CacheKeyFactory,
    private readonly cacheInvalidatorService: CacheInvalidatorService,
  ) {}

  async create(createBannerInput: CreateBannerInput): Promise<Banner> {
    const createdBanner = new this.bannerModel(createBannerInput);
    const savedBanner = await createdBanner.save();
    await this.cacheInvalidatorService.invalidateBanner();
    return savedBanner;
  }

  async findAll(): Promise<Banner[]> {
    const versionKey = this.cacheKeyFactory.getBannerListVersionKey();
    const version = await this.cacheService.getVersion(versionKey);
    const key = this.cacheKeyFactory.getBannerListKey(version, 'all');

    const cached = await this.cacheService.get<Banner[]>(key);
    if (cached) {
      return cached;
    }

    const data = (await this.bannerModel
      .find()
      .sort({ position: 1 })
      .lean()
      .exec()) as unknown as Banner[];
    
    await this.cacheService.set(key, data);
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
    const versionKey = this.cacheKeyFactory.getBannerListVersionKey();
    const version = await this.cacheService.getVersion(versionKey);
    const key = this.cacheKeyFactory.getBannerListKey(version, 'active');

    const cached = await this.cacheService.get<Banner[]>(key);
    if (cached) {
      return cached;
    }

    const now = new Date();
    const data = (await this.bannerModel
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
      .exec()) as unknown as Banner[];

    await this.cacheService.set(key, data);
    return data;
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
    await this.cacheInvalidatorService.invalidateBanner();
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
    await this.cacheInvalidatorService.invalidateBanner();
    return banner;
  }
}
