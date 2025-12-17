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
import { AppCacheModule } from './cache/app-cache.module';
import { CoreModule } from './core/core.module';
import { CatalogModule } from './catalog/catalog.module';
import { IdentityModule } from './identity/identity.module';
import { CaslModule } from './casl/casl.module';
import { GuestModule } from './guest/guest.module';
import { CartModule } from './cart/cart.module';
import { CouponModule } from './coupon/coupon.module';
import { ChargesModule } from './charges/charges.module';
import { AddressModule } from './address/address.module';
import { ManufacturingAddressModule } from './manufacturing-address/manufacturing-address.module';
import { SeoContentModule } from './seo-content/seo-content.module';
import { RbacModule } from './rbac/rbac.module';
import { FooterDetailModule } from './footer-detail/footer-detail.module';
import { FAQModule } from './faq/faq.module';


@Module({
  imports: [
    CoreModule,
    CatalogModule,
    IdentityModule,
    AdminModule,
    BannerModule,
    DashboardModule,
    PolicyModule,
    CaslModule,
    GuestModule,
    CartModule,
    CouponModule,
    ChargesModule,
    AddressModule,
    ManufacturingAddressModule,
    SeoContentModule,
    RbacModule,
    FooterDetailModule,
    FAQModule,
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
  ],
})
export class AppModule {}
