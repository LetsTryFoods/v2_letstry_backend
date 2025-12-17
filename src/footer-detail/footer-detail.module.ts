import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FooterDetailService } from './footer-detail.service';
import { FooterDetailResolver } from './footer-detail.resolver';
import { FooterDetail, FooterDetailSchema } from './footer-detail.schema';
import { AdminModule } from '../admin/admin.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: FooterDetail.name, schema: FooterDetailSchema }]),
    AdminModule,
  ],
  providers: [FooterDetailService, FooterDetailResolver],
  exports: [FooterDetailService],
})
export class FooterDetailModule {}
