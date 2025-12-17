import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { NewsletterSubscription, NewsletterSubscriptionSchema } from './newsletter.schema';
import { NewsletterService } from './newsletter.service';
import { NewsletterResolver } from './newsletter.resolver';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: NewsletterSubscription.name, schema: NewsletterSubscriptionSchema },
    ]),
  ],
  providers: [NewsletterService, NewsletterResolver],
  exports: [NewsletterService],
})
export class NewsletterModule {}
