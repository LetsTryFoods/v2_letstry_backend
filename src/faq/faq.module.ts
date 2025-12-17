import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FAQService } from './faq.service';
import { FAQResolver } from './faq.resolver';
import { FAQ, FAQSchema } from './faq.schema';
import { AdminModule } from '../admin/admin.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: FAQ.name, schema: FAQSchema }]),
    AdminModule,
  ],
  providers: [FAQService, FAQResolver],
  exports: [FAQService],
})
export class FAQModule {}
