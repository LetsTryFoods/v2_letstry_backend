import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppResolver } from './app.resolver';
import { AppService } from './app.service';
import { AdminModule } from './admin/admin.module';
import { BannerModule } from './banner/banner.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { PolicyModule } from './policy/policy.module';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { AuthModule } from './auth/auth.module';
import { UserAuthModule } from './user-auth/user-auth.module';
import { RolesGuard } from './common/guards/roles.guard';
import { GraphqlThrottlerGuard } from './common/guards/graphql-throttler.guard';
import { AppCacheModule } from './cache/app-cache.module';
import { CoreModule } from './core/core.module';
import { CatalogModule } from './catalog/catalog.module';
import { IdentityModule } from './identity/identity.module';
import { CaslModule } from './casl/casl.module';

import { ThrottlerModule } from '@nestjs/throttler';

@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 10,
      },
    ]),
    CoreModule,
    CatalogModule,
    IdentityModule,
    AdminModule,
    BannerModule,
    DashboardModule,
    PolicyModule,
    CaslModule,
    UserAuthModule,
    AuthModule,
    AppCacheModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    AppResolver,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    {
      provide: APP_GUARD,
      useClass: GraphqlThrottlerGuard,
    },
  ],
})
export class AppModule {}
