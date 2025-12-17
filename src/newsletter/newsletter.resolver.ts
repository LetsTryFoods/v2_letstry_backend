import { Resolver, Mutation, Query, Args, Context } from '@nestjs/graphql';
import { NewsletterService } from './newsletter.service';
import { SubscribeNewsletterInput } from './newsletter.input';
import { SubscribeNewsletterResponse } from './newsletter.graphql';
import { NewsletterSubscription } from './newsletter.schema';
import { Public } from '../common/decorators/public.decorator';
import { UseGuards } from '@nestjs/common';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { RolesGuard } from '../common/guards/roles.guard';

@Resolver()
export class NewsletterResolver {
  constructor(private readonly newsletterService: NewsletterService) {}

  @Mutation(() => SubscribeNewsletterResponse)
  @Public()
  async subscribeNewsletter(
    @Args('input') input: SubscribeNewsletterInput,
    @Context() context: any,
  ): Promise<SubscribeNewsletterResponse> {
    const ipAddress = this.extractIpAddress(context);
    return this.newsletterService.subscribe(input, ipAddress);
  }

  @Mutation(() => SubscribeNewsletterResponse)
  @Public()
  async unsubscribeNewsletter(
    @Args('email') email: string,
  ): Promise<SubscribeNewsletterResponse> {
    return this.newsletterService.unsubscribe(email);
  }

  @Query(() => [NewsletterSubscription])
  @Roles(Role.ADMIN)
  @UseGuards(RolesGuard)
  async getAllNewsletterSubscriptions(
    @Args('isActive', { nullable: true }) isActive?: boolean,
  ): Promise<NewsletterSubscription[]> {
    return this.newsletterService.getAllSubscriptions(isActive);
  }

  @Query(() => Number)
  @Roles(Role.ADMIN)
  @UseGuards(RolesGuard)
  async getNewsletterSubscriptionCount(
    @Args('isActive', { nullable: true }) isActive?: boolean,
  ): Promise<number> {
    return this.newsletterService.getSubscriptionCount(isActive);
  }

  private extractIpAddress(context: any): string | undefined {
    const req = context.req;
    return req?.ip || req?.headers?.['x-forwarded-for'] || req?.connection?.remoteAddress;
  }
}
