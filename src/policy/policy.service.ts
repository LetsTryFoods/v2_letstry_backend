import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Policy, PolicyDocument } from './policy.schema';
import { CreatePolicyInput, UpdatePolicyInput } from './policy.input';
import { SlugUtils } from '../utils/slug.utils';
import { CacheService } from '../cache/cache.service';
import { CacheKeyFactory } from '../cache/cache-key.factory';
import { CacheInvalidatorService } from '../cache/cache-invalidator.service';

@Injectable()
export class PolicyService {
  private readonly TTL = 15552000000; // 180 days in milliseconds

  constructor(
    @InjectModel(Policy.name) private policyModel: Model<PolicyDocument>,
    private readonly cacheService: CacheService,
    private readonly cacheKeyFactory: CacheKeyFactory,
    private readonly cacheInvalidatorService: CacheInvalidatorService,
  ) {}

  async create(createPolicyInput: CreatePolicyInput): Promise<Policy> {
    const input = { ...createPolicyInput, title: SlugUtils.generateSlug(createPolicyInput.title) };
    const createdPolicy = new this.policyModel(input);
    const savedPolicy = await createdPolicy.save();
    await this.cacheInvalidatorService.invalidatePolicy(savedPolicy);
    return savedPolicy;
  }

  async findAll(): Promise<Policy[]> {
    const versionKey = this.cacheKeyFactory.getPolicyListVersionKey();
    const version = await this.cacheService.getVersion(versionKey);
    const key = this.cacheKeyFactory.getPolicyListKey(version);

    const cached = await this.cacheService.get<Policy[]>(key);
    if (cached) return cached;

    const data = (await this.policyModel.find().lean().exec()) as unknown as Policy[];
    await this.cacheService.set(key, data, this.TTL);
    return data;
  }

  async findByType(type: string): Promise<Policy[]> {
    const versionKey = this.cacheKeyFactory.getPolicyDetailVersionKey(type);
    const version = await this.cacheService.getVersion(versionKey);
    const key = this.cacheKeyFactory.getPolicyDetailKey(type, version);

    const cached = await this.cacheService.get<Policy[]>(key);
    if (cached) return cached;

    const data = (await this.policyModel
      .find({ type })
      .lean()
      .exec()) as unknown as Policy[];
    
    await this.cacheService.set(key, data, this.TTL);
    return data;
  }

  async findOne(id: string): Promise<Policy> {
    const versionKey = this.cacheKeyFactory.getPolicyDetailVersionKey(id);
    const version = await this.cacheService.getVersion(versionKey);
    const key = this.cacheKeyFactory.getPolicyDetailKey(id, version);

    const cached = await this.cacheService.get<Policy>(key);
    if (cached) return cached;

    const policy = (await this.policyModel
      .findById(id)
      .lean()
      .exec()) as unknown as Policy | null;
    if (!policy) {
      throw new NotFoundException(`Policy with ID ${id} not found`);
    }
    await this.cacheService.set(key, policy, this.TTL);
    return policy;
  }

  async update(
    id: string,
    updatePolicyInput: UpdatePolicyInput,
  ): Promise<Policy> {
    const input = { ...updatePolicyInput };
    if (input.title) {
      input.title = SlugUtils.generateSlug(input.title);
    }
    const policy = (await this.policyModel
      .findByIdAndUpdate(id, input, { new: true })
      .lean()
      .exec()) as unknown as Policy | null;
    if (!policy) {
      throw new NotFoundException(`Policy with ID ${id} not found`);
    }
    await this.cacheInvalidatorService.invalidatePolicy(policy);
    return policy;
  }

  async remove(id: string): Promise<Policy> {
    const policy = (await this.policyModel
      .findByIdAndDelete(id)
      .lean()
      .exec()) as unknown as Policy | null;
    if (!policy) {
      throw new NotFoundException(`Policy with ID ${id} not found`);
    }
    await this.cacheInvalidatorService.invalidatePolicy(policy);
    return policy;
  }
}