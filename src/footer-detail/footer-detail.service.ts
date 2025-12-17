import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { FooterDetail, FooterDetailDocument } from './footer-detail.schema';
import { CreateFooterDetailInput, UpdateFooterDetailInput } from './footer-detail.input';
import { CacheService } from '../cache/cache.service';
import { CacheKeyFactory } from '../cache/cache-key.factory';
import { CacheInvalidatorService } from '../cache/cache-invalidator.service';
import { WinstonLoggerService } from '../logger/logger.service';

@Injectable()
export class FooterDetailService {
  private readonly TTL = 15552000000; // ~6 months
  private readonly CACHE_TYPE_ALL = 'all';
  private readonly CACHE_TYPE_ACTIVE = 'active';

  constructor(
    @InjectModel(FooterDetail.name) private footerDetailModel: Model<FooterDetailDocument>,
    private readonly cacheService: CacheService,
    private readonly cacheKeyFactory: CacheKeyFactory,
    private readonly cacheInvalidatorService: CacheInvalidatorService,
    private readonly logger: WinstonLoggerService,
  ) {}

  async create(createFooterDetailInput: CreateFooterDetailInput): Promise<FooterDetail> {
    const createdFooterDetail = new this.footerDetailModel(createFooterDetailInput);
    const savedFooterDetail = await createdFooterDetail.save();
    await this.cacheInvalidatorService.invalidateFooterDetail();
    this.logger.log(`Footer detail created: ${savedFooterDetail._id}`);
    return savedFooterDetail.toObject();
  }

  async findAll(): Promise<FooterDetail[]> {
    return this.getCachedList(this.CACHE_TYPE_ALL, () =>
      this.footerDetailModel.find().sort({ createdAt: -1 }).lean().exec(),
    );
  }

  async findActive(): Promise<FooterDetail[]> {
    return this.getCachedList(this.CACHE_TYPE_ACTIVE, () =>
      this.footerDetailModel
        .find({ isActive: true })
        .sort({ createdAt: -1 })
        .lean()
        .exec(),
    );
  }

  async findOne(id: string): Promise<FooterDetail> {
    return this.findByIdOrThrow(id);
  }

  async update(
    id: string,
    updateFooterDetailInput: UpdateFooterDetailInput,
  ): Promise<FooterDetail> {
    const footerDetail = await this.footerDetailModel
      .findByIdAndUpdate(id, updateFooterDetailInput, { new: true })
      .lean()
      .exec();

    if (!footerDetail) {
      throw new NotFoundException(`Footer detail with ID ${id} not found`);
    }

    await this.cacheInvalidatorService.invalidateFooterDetail();
    this.logger.log(`Footer detail updated: ${id}`);
    return footerDetail as FooterDetail;
  }

  async remove(id: string): Promise<FooterDetail> {
    const footerDetail = await this.footerDetailModel.findByIdAndDelete(id).lean().exec();

    if (!footerDetail) {
      throw new NotFoundException(`Footer detail with ID ${id} not found`);
    }

    await this.cacheInvalidatorService.invalidateFooterDetail();
    this.logger.log(`Footer detail removed: ${id}`);
    return footerDetail as FooterDetail;
  }

  private async getCachedList(
    type: string,
    fetcher: () => Promise<any[]>,
  ): Promise<FooterDetail[]> {
    const versionKey = this.cacheKeyFactory.getFooterDetailListVersionKey();
    const version = await this.cacheService.getVersion(versionKey);
    const key = this.cacheKeyFactory.getFooterDetailListKey(version, type);

    const cached = await this.cacheService.get<FooterDetail[]>(key);
    if (cached) return cached;

    const data = (await fetcher()) as FooterDetail[];
    await this.cacheService.set(key, data, this.TTL);
    return data;
  }

  private async findByIdOrThrow(id: string): Promise<FooterDetail> {
    const footerDetail = await this.footerDetailModel.findById(id).lean().exec();
    if (!footerDetail) {
      throw new NotFoundException(`Footer detail with ID ${id} not found`);
    }
    return footerDetail as FooterDetail;
  }
}
