import { CacheService } from '../../cache/cache.service';
import { PRODUCT_CACHE_TTL } from './product.types';

export interface CacheStrategy<T> {
  execute(fetchData: () => Promise<T>): Promise<T>;
}

export class NoCacheStrategy<T> implements CacheStrategy<T> {
  async execute(fetchData: () => Promise<T>): Promise<T> {
    return fetchData();
  }
}

export class VersionedCacheStrategy<T> implements CacheStrategy<T> {
  constructor(
    private readonly cacheService: CacheService,
    private readonly versionKey: string,
    private readonly dataKeyFactory: (version: string) => string,
    private readonly ttl: number = PRODUCT_CACHE_TTL,
  ) {}

  async execute(fetchData: () => Promise<T>): Promise<T> {
    const version = await this.cacheService.getVersion(this.versionKey);
    const key = this.dataKeyFactory(version.toString());

    const cached = await this.cacheService.get<T>(key);
    if (cached) return cached;

    const data = await fetchData();
    if (data) {
      await this.cacheService.set(key, data, this.ttl);
    }
    return data;
  }
}
