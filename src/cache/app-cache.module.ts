import { Module, Global } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { CacheService } from './cache.service';
import { CacheKeyFactory } from './cache-key.factory';
import { CacheInvalidatorService } from './cache-invalidator.service';

@Global()
@Module({
  imports: [CacheModule.register()],
  providers: [CacheService, CacheKeyFactory, CacheInvalidatorService],
  exports: [CacheService, CacheKeyFactory, CacheInvalidatorService],
})
export class AppCacheModule {}
