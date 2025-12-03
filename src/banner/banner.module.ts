import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BannerService } from './banner.service';
import { BannerResolver } from './banner.resolver';
import { Banner, BannerSchema } from './banner.schema';
import { AdminModule } from '../admin/admin.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Banner.name, schema: BannerSchema }]),
    AdminModule,
  ],
  providers: [BannerService, BannerResolver],
  exports: [BannerService],
})
export class BannerModule {}
