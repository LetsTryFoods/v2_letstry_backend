import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SeoContent, SeoContentSchema } from './seo-content.schema';
import { SeoContentService } from './seo-content.service';
import { SeoContentResolver } from './seo-content.resolver';
import { SeoPage, SeoPageSchema } from './seo-page.schema';
import { SeoPageService } from './seo-page.service';
import { SeoPageResolver } from './seo-page.resolver';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: SeoContent.name, schema: SeoContentSchema },
      { name: SeoPage.name, schema: SeoPageSchema },
    ]),
  ],
  providers: [
    SeoContentService,
    SeoContentResolver,
    SeoPageService,
    SeoPageResolver,
  ],
  exports: [SeoContentService, SeoPageService],
})
export class SeoContentModule {}
