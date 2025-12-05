import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Banner, BannerDocument } from './banner.schema';
import { CreateBannerInput, UpdateBannerInput } from './banner.input';
import { CacheService } from '../cache/cache.service';
import { CacheKeyFactory } from '../cache/cache-key.factory';
import { CacheInvalidatorService } from '../cache/cache-invalidator.service';

import { WinstonLoggerService } from '../logger/logger.service';
@Injectable()
export class BannerService {
  private readonly TTL = 15552000000;
  private readonly CACHE_TYPE_ALL = 'all';
  private readonly CACHE_TYPE_ACTIVE = 'active';

  constructor(
    @InjectModel(Banner.name) private bannerModel: Model<BannerDocument>,
    private readonly cacheService: CacheService,
    private readonly cacheKeyFactory: CacheKeyFactory,
    private readonly cacheInvalidatorService: CacheInvalidatorService,
    private readonly logger: WinstonLoggerService,
  ) {}

  async create(createBannerInput: CreateBannerInput): Promise<Banner> {
    const createdBanner = new this.bannerModel(createBannerInput);
    const savedBanner = await createdBanner.save();
    await this.cacheInvalidatorService.invalidateBanner();
    this.logger.log(`Banner created: ${savedBanner._id}`);
    return savedBanner.toObject();
  }

  async findAll(): Promise<Banner[]> {
    return this.getCachedList(this.CACHE_TYPE_ALL, () =>
      this.bannerModel.find().sort({ position: 1 }).lean().exec(),
    );
  }

  async findActive(): Promise<Banner[]> {
    return this.getCachedList(this.CACHE_TYPE_ACTIVE, () =>
      this.bannerModel
        .find(this.buildActiveQuery())
        .sort({ position: 1 })
        .lean()
        .exec(),
    );
  }

  async findOne(id: string): Promise<Banner> {
    return this.findByIdOrThrow(id);
  }

  async update(
    id: string,
    updateBannerInput: UpdateBannerInput,
  ): Promise<Banner> {
    const banner = await this.bannerModel
      .findByIdAndUpdate(id, updateBannerInput, { new: true })
      .lean()
      .exec();

    if (!banner) {
      throw new NotFoundException(`Banner with ID ${id} not found`);
    }

    await this.cacheInvalidatorService.invalidateBanner();
    this.logger.log(`Banner updated: ${id}`);
    return banner as Banner;
  }

  async remove(id: string): Promise<Banner> {
    const banner = await this.bannerModel.findByIdAndDelete(id).lean().exec();

    if (!banner) {
      throw new NotFoundException(`Banner with ID ${id} not found`);
    }

    await this.cacheInvalidatorService.invalidateBanner();
    this.logger.log(`Banner removed: ${id}`);
    return banner as Banner;
  }

  private async getCachedList(
    type: string,
    fetcher: () => Promise<any[]>,
  ): Promise<Banner[]> {
    const versionKey = this.cacheKeyFactory.getBannerListVersionKey();
    const version = await this.cacheService.getVersion(versionKey);
    const key = this.cacheKeyFactory.getBannerListKey(version, type);

    const cached = await this.cacheService.get<Banner[]>(key);
    if (cached) return cached;

    const data = (await fetcher()) as Banner[];
    await this.cacheService.set(key, data, this.TTL);
    return data;
  }

  private async findByIdOrThrow(id: string): Promise<Banner> {
    const banner = await this.bannerModel.findById(id).lean().exec();
    if (!banner) {
      throw new NotFoundException(`Banner with ID ${id} not found`);
    }
    return banner as Banner;
  }

  private buildActiveQuery(): any {
    const now = new Date();
    return {
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
    };
  }
}
