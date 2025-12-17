import { Injectable, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { NewsletterSubscription, NewsletterSubscriptionDocument } from './newsletter.schema';
import { SubscribeNewsletterInput } from './newsletter.input';
import { SubscribeNewsletterResponse } from './newsletter.graphql';

@Injectable()
export class NewsletterService {
  constructor(
    @InjectModel(NewsletterSubscription.name)
    private newsletterModel: Model<NewsletterSubscriptionDocument>,
  ) {}

  async subscribe(input: SubscribeNewsletterInput, ipAddress?: string): Promise<SubscribeNewsletterResponse> {
    const normalizedEmail = this.normalizeEmail(input.email);
    const existingSubscription = await this.findByEmail(normalizedEmail);

    if (existingSubscription) {
      return this.handleExistingSubscription(existingSubscription);
    }

    await this.createSubscription(normalizedEmail, input.source, ipAddress);
    return this.buildSuccessResponse(normalizedEmail);
  }

  private normalizeEmail(email: string): string {
    return email.toLowerCase().trim();
  }

  private async findByEmail(email: string): Promise<NewsletterSubscriptionDocument | null> {
    return this.newsletterModel.findOne({ email }).exec();
  }

  private async handleExistingSubscription(subscription: NewsletterSubscriptionDocument): Promise<SubscribeNewsletterResponse> {
    if (subscription.isActive) {
      return {
        success: false,
        message: 'This email is already subscribed to our newsletter.',
        email: subscription.email,
      };
    }

    return this.reactivateSubscription(subscription);
  }

  private async reactivateSubscription(subscription: NewsletterSubscriptionDocument): Promise<SubscribeNewsletterResponse> {
    await this.updateSubscriptionStatus(subscription.email, true);

    return {
      success: true,
      message: 'Your subscription has been reactivated successfully!',
      email: subscription.email,
    };
  }

  private async updateSubscriptionStatus(email: string, isActive: boolean): Promise<void> {
    await this.newsletterModel.findOneAndUpdate(
      { email },
      { isActive },
      { new: true }
    ).exec();
  }

  private async createSubscription(email: string, source?: string, ipAddress?: string): Promise<void> {
    await this.newsletterModel.create({
      email,
      source,
      ipAddress,
      isActive: true,
    });
  }

  private buildSuccessResponse(email: string): SubscribeNewsletterResponse {
    return {
      success: true,
      message: 'Successfully subscribed to our newsletter!',
      email,
    };
  }

  async unsubscribe(email: string): Promise<SubscribeNewsletterResponse> {
    const normalizedEmail = this.normalizeEmail(email);
    const subscription = await this.findByEmail(normalizedEmail);

    if (!subscription) {
      return this.buildNotFoundResponse();
    }

    if (!subscription.isActive) {
      return this.buildAlreadyUnsubscribedResponse(normalizedEmail);
    }

    await this.updateSubscriptionStatus(normalizedEmail, false);
    return this.buildUnsubscribeSuccessResponse(normalizedEmail);
  }

  private buildNotFoundResponse(): SubscribeNewsletterResponse {
    return {
      success: false,
      message: 'Email not found in our subscription list.',
    };
  }

  private buildAlreadyUnsubscribedResponse(email: string): SubscribeNewsletterResponse {
    return {
      success: false,
      message: 'This email is already unsubscribed.',
      email,
    };
  }

  private buildUnsubscribeSuccessResponse(email: string): SubscribeNewsletterResponse {
    return {
      success: true,
      message: 'Successfully unsubscribed from our newsletter.',
      email,
    };
  }

  async getAllSubscriptions(isActive?: boolean): Promise<NewsletterSubscription[]> {
    const filter = isActive !== undefined ? { isActive } : {};
    return this.newsletterModel.find(filter).sort({ createdAt: -1 }).exec();
  }

  async getSubscriptionCount(isActive?: boolean): Promise<number> {
    const filter = isActive !== undefined ? { isActive } : {};
    return this.newsletterModel.countDocuments(filter).exec();
  }
}
