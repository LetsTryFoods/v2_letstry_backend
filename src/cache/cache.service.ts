import { Inject, Injectable, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';

@Injectable()
export class CacheService {
  private readonly logger = new Logger('Redis');

  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  /**
   * Retrieve a value from the cache.
   */
  async get<T>(key: string): Promise<T | undefined> {
    const start = Date.now();
    try {
      const value = await this.cacheManager.get<T>(key);
      const duration = Date.now() - start;
      
      if (value) {
        this.logger.log({
          msg: `Cache HIT`,
          operation: 'GET',
          key,
          status: 'HIT',
          duration: `${duration}ms`,
          type: Array.isArray(value) ? 'Array' : typeof value,
        });
      } else {
        this.logger.log({
          msg: `Cache MISS`,
          operation: 'GET',
          key,
          status: 'MISS',
          duration: `${duration}ms`,
        });
      }
      return value;
    } catch (error) {
      this.logger.error({
        msg: `Cache GET Error`,
        operation: 'GET',
        key,
        error: error.message,
        stack: error.stack,
        duration: `${Date.now() - start}ms`,
      });
      throw error;
    }
  }

  /**
   * Set a value in the cache with an optional TTL.
   * @param ttl Time to live in milliseconds (default: 5 minutes)
   */
  async set(key: string, value: any, ttl: number = 300000): Promise<void> {
    const start = Date.now();
    try {
      await this.cacheManager.set(key, value, ttl);
      const duration = Date.now() - start;

      let valuePreview = 'unknown';
      if (value === null) valuePreview = 'null';
      else if (typeof value === 'object') valuePreview = Array.isArray(value) ? `Array(${value.length})` : 'Object';
      else valuePreview = String(value).substring(0, 50);

      this.logger.log({
        msg: `Cache SET`,
        operation: 'SET',
        key,
        ttl,
        duration: `${duration}ms`,
        valueType: typeof value,
        valuePreview,
      });
    } catch (error) {
      this.logger.error({
        msg: `Cache SET Error`,
        operation: 'SET',
        key,
        error: error.message,
        stack: error.stack,
        duration: `${Date.now() - start}ms`,
      });
      throw error;
    }
  }

  /**
   * Delete a specific key.
   */
  async del(key: string): Promise<void> {
    const start = Date.now();
    try {
      await this.cacheManager.del(key);
      this.logger.log({
        msg: `Cache DEL`,
        operation: 'DEL',
        key,
        duration: `${Date.now() - start}ms`,
      });
    } catch (error) {
      this.logger.error({
        msg: `Cache DEL Error`,
        operation: 'DEL',
        key,
        error: error.message,
        stack: error.stack,
        duration: `${Date.now() - start}ms`,
      });
      throw error;
    }
  }

  /**
   * Get the current version for a namespace.
   * If not found, returns 1.
   */
  async getVersion(namespace: string): Promise<number> {
    // We don't log detailed metrics here to avoid noise, as this is a sub-operation of bump/get keys
    // But if debugging is needed, we can uncomment:
    // const start = Date.now();
    const version = await this.cacheManager.get<number>(namespace);
    // this.logger.debug({ operation: 'getVersion', namespace, version: version || 1, duration: `${Date.now() - start}ms` });
    return version || 1;
  }

  /**
   * Increment the version for a namespace.
   * This effectively invalidates all keys using this version.
   * Version keys should NOT have a TTL.
   */
  async bumpVersion(namespace: string): Promise<number> {
    const start = Date.now();
    try {
      const current = await this.getVersion(namespace);
      const next = current + 1;
      
      // We set with 0 or undefined for "no TTL" / "infinite" depending on the store config.
      // However, cache-manager often requires a TTL. We'll use a very long TTL for versions (e.g. 1 year).
      // 31536000000 ms = 1 year
      await this.cacheManager.set(namespace, next, 31536000000); 
      
      this.logger.log({
        msg: `Cache BUMP VERSION`,
        operation: 'BUMP_VERSION',
        namespace,
        from: current,
        to: next,
        duration: `${Date.now() - start}ms`,
      });
      
      return next;
    } catch (error) {
      this.logger.error({
        msg: `Cache BUMP VERSION Error`,
        operation: 'BUMP_VERSION',
        namespace,
        error: error.message,
        stack: error.stack,
        duration: `${Date.now() - start}ms`,
      });
      throw error;
    }
  }
}
