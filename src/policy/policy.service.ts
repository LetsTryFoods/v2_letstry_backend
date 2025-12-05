import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Policy, PolicyDocument } from './policy.schema';
import { CreatePolicyInput, UpdatePolicyInput } from './policy.input';
import { SlugUtils } from '../utils/slug.utils';
import { CacheService } from '../cache/cache.service';
import { CacheKeyFactory } from '../cache/cache-key.factory';
import { CacheInvalidatorService } from '../cache/cache-invalidator.service';

// ============================================================================
// 1. TYPES & CONSTANTS
// ============================================================================
export const POLICY_CACHE_TTL = 15552000000;

export interface PolicyFilter {
  _id?: string;
  type?: string;
}

// ============================================================================
// 2. QUERY FILTER BUILDER (Single Responsibility)
// ============================================================================
export class PolicyQueryBuilder {
  private filter: PolicyFilter = {};

  withId(id: string): this {
    this.filter._id = id;
    return this;
  }

  withType(type: string): this {
    this.filter.type = type;
    return this;
  }

  build(): PolicyFilter {
    return this.filter;
  }

  // Static factory methods
  static forId(id: string): PolicyFilter {
    return new PolicyQueryBuilder().withId(id).build();
  }

  static forType(type: string): PolicyFilter {
    return new PolicyQueryBuilder().withType(type).build();
  }

  static forAll(): PolicyFilter {
    return new PolicyQueryBuilder().build();
  }
}

// ============================================================================
// 3. CACHE STRATEGY (Abstraction for caching logic)
// ============================================================================
export interface CacheStrategy<T> {
  execute(fetchData: () => Promise<T>): Promise<T>;
}

export class VersionedCacheStrategy<T> implements CacheStrategy<T> {
  constructor(
    private readonly cacheService: CacheService,
    private readonly versionKey: string,
    private readonly dataKeyFactory: (version: number) => string,
    private readonly ttl: number = POLICY_CACHE_TTL,
  ) {}

  async execute(fetchData: () => Promise<T>): Promise<T> {
    const version = await this.cacheService.getVersion(this.versionKey);
    const key = this.dataKeyFactory(version);

    const cached = await this.cacheService.get<T>(key);
    if (cached) return cached;

    const data = await fetchData();
    if (data) {
      await this.cacheService.set(key, data, this.ttl);
    }
    return data;
  }
}

// ============================================================================
// 4. POLICY REPOSITORY (Data Access Layer)
// ============================================================================
export class PolicyRepository {
  constructor(private readonly policyModel: Model<PolicyDocument>) {}

  async find(filter: PolicyFilter): Promise<Policy[]> {
    return this.policyModel.find(filter).lean().exec() as unknown as Policy[];
  }

  async findOne(filter: PolicyFilter): Promise<Policy | null> {
    return this.policyModel.findOne(filter).lean().exec() as unknown as Policy | null;
  }

  async findById(id: string): Promise<Policy | null> {
    return this.policyModel.findById(id).lean().exec() as unknown as Policy | null;
  }

  async create(data: any): Promise<Policy> {
    const policy = new this.policyModel(data);
    return policy.save();
  }

  async findByIdAndUpdate(
    id: string,
    update: any,
    options?: any,
  ): Promise<Policy | null> {
    return this.policyModel
      .findByIdAndUpdate(id, update, options)
      .lean()
      .exec() as unknown as Policy | null;
  }

  async findByIdAndDelete(id: string): Promise<Policy | null> {
    return this.policyModel
      .findByIdAndDelete(id)
      .lean()
      .exec() as unknown as Policy | null;
  }
}

// ============================================================================
// 5. CACHE STRATEGY FACTORY (Creates appropriate cache strategy)
// ============================================================================
export class PolicyCacheStrategyFactory {
  constructor(
    private readonly cacheService: CacheService,
    private readonly cacheKeyFactory: CacheKeyFactory,
  ) {}

  createForList(type?: string): CacheStrategy<Policy[]> {
    return new VersionedCacheStrategy<Policy[]>(
      this.cacheService,
      this.cacheKeyFactory.getPolicyListVersionKey(),
      (version) => this.cacheKeyFactory.getPolicyListKey(version, type || 'all'),
    );
  }

  createForDetail(id: string): CacheStrategy<Policy | null> {
    return new VersionedCacheStrategy<Policy | null>(
      this.cacheService,
      this.cacheKeyFactory.getPolicyDetailVersionKey(id),
      (version) => this.cacheKeyFactory.getPolicyDetailKey(id, version),
    );
  }
}

// ============================================================================
// 6. GENERIC QUERY EXECUTOR (Eliminates all query duplication)
// ============================================================================
export class QueryExecutor {
  constructor(
    private readonly repository: PolicyRepository,
    private readonly cacheStrategyFactory: PolicyCacheStrategyFactory,
  ) {}

  async executeFind(
    filter: PolicyFilter,
    cacheStrategy: CacheStrategy<Policy[]>,
  ): Promise<Policy[]> {
    return cacheStrategy.execute(() => this.repository.find(filter));
  }

  async executeFindOne(
    filter: PolicyFilter,
    cacheStrategy: CacheStrategy<Policy | null>,
  ): Promise<Policy | null> {
    return cacheStrategy.execute(() => this.repository.findOne(filter));
  }

  async executeFindOneOrThrow(
    filter: PolicyFilter,
    cacheStrategy: CacheStrategy<Policy | null>,
    errorMessage: string,
  ): Promise<Policy> {
    const result = await this.executeFindOne(filter, cacheStrategy);
    if (!result) {
      throw new NotFoundException(errorMessage);
    }
    return result;
  }
}

// ============================================================================
// 7. POLICY QUERY SERVICE (Zero duplication)
// ============================================================================
export class PolicyQueryService {
  private readonly executor: QueryExecutor;

  constructor(
    repository: PolicyRepository,
    private readonly cacheStrategyFactory: PolicyCacheStrategyFactory,
  ) {
    this.executor = new QueryExecutor(repository, cacheStrategyFactory);
  }

  async findAll(): Promise<Policy[]> {
    const filter = PolicyQueryBuilder.forAll();
    const strategy = this.cacheStrategyFactory.createForList();
    return this.executor.executeFind(filter, strategy);
  }

  async findByType(type: string): Promise<Policy[]> {
    const filter = PolicyQueryBuilder.forType(type);
    const strategy = this.cacheStrategyFactory.createForList(type);
    return this.executor.executeFind(filter, strategy);
  }

  async findOne(id: string): Promise<Policy> {
    const filter = PolicyQueryBuilder.forId(id);
    const strategy = this.cacheStrategyFactory.createForDetail(id);
    return this.executor.executeFindOneOrThrow(
      filter,
      strategy,
      `Policy with ID ${id} not found`,
    );
  }
}

// ============================================================================
// 8. SLUG PROCESSOR (Single Responsibility for slug handling)
// ============================================================================
export class PolicySlugProcessor {
  static processCreateInput(input: CreatePolicyInput): CreatePolicyInput {
    return {
      ...input,
      title: SlugUtils.generateSlug(input.title),
    };
  }

  static processUpdateInput(input: UpdatePolicyInput): UpdatePolicyInput {
    const processed = { ...input };
    if (processed.title) {
      processed.title = SlugUtils.generateSlug(processed.title);
    }
    return processed;
  }
}

// ============================================================================
// 9. POLICY COMMAND SERVICE (Write Operations)
// ============================================================================
export class PolicyCommandService {
  constructor(
    private readonly repository: PolicyRepository,
    private readonly cacheInvalidator: CacheInvalidatorService,
  ) {}

  async create(input: CreatePolicyInput): Promise<Policy> {
    const processedInput = PolicySlugProcessor.processCreateInput(input);
    const policy = await this.repository.create(processedInput);
    await this.cacheInvalidator.invalidatePolicy(policy);
    return policy;
  }

  async update(id: string, input: UpdatePolicyInput): Promise<Policy> {
    const processedInput = PolicySlugProcessor.processUpdateInput(input);
    const policy = await this.repository.findByIdAndUpdate(id, processedInput, {
      new: true,
    });

    if (!policy) {
      throw new NotFoundException(`Policy with ID ${id} not found`);
    }

    await this.cacheInvalidator.invalidatePolicy(policy);
    return policy;
  }

  async remove(id: string): Promise<Policy> {
    const policy = await this.repository.findByIdAndDelete(id);

    if (!policy) {
      throw new NotFoundException(`Policy with ID ${id} not found`);
    }

    await this.cacheInvalidator.invalidatePolicy(policy);
    return policy;
  }
}

// ============================================================================
// 10. MAIN POLICY SERVICE (Facade Pattern)
// ============================================================================
@Injectable()
export class PolicyService {
  private readonly queryService: PolicyQueryService;
  private readonly commandService: PolicyCommandService;

  constructor(
    @InjectModel(Policy.name) policyModel: Model<PolicyDocument>,
    cacheService: CacheService,
    cacheKeyFactory: CacheKeyFactory,
    cacheInvalidatorService: CacheInvalidatorService,
  ) {
    const repository = new PolicyRepository(policyModel);
    const cacheStrategyFactory = new PolicyCacheStrategyFactory(
      cacheService,
      cacheKeyFactory,
    );

    this.queryService = new PolicyQueryService(repository, cacheStrategyFactory);
    this.commandService = new PolicyCommandService(
      repository,
      cacheInvalidatorService,
    );
  }

  // ========== WRITE OPERATIONS ==========
  create(input: CreatePolicyInput): Promise<Policy> {
    return this.commandService.create(input);
  }

  update(id: string, input: UpdatePolicyInput): Promise<Policy> {
    return this.commandService.update(id, input);
  }

  remove(id: string): Promise<Policy> {
    return this.commandService.remove(id);
  }

  // ========== READ OPERATIONS ==========
  findAll(): Promise<Policy[]> {
    return this.queryService.findAll();
  }

  findByType(type: string): Promise<Policy[]> {
    return this.queryService.findByType(type);
  }

  findOne(id: string): Promise<Policy> {
    return this.queryService.findOne(id);
  }
}