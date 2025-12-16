import {
  Injectable,
  NotFoundException,
  ConflictException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { SeoPage, SeoPageDocument } from './seo-page.schema';
import { CreateSeoPageInput, UpdateSeoPageInput } from './seo-page.input';
import { WinstonLoggerService } from '../logger/logger.service';

// Default pages to seed on first run
const DEFAULT_SEO_PAGES: CreateSeoPageInput[] = [
  { slug: 'home', label: 'Home Page', sortOrder: 1 },
  { slug: 'combos', label: 'Combos Page', sortOrder: 2 },
  { slug: 'about-us', label: 'About Us', sortOrder: 3 },
  { slug: 'contact', label: 'Contact Page', sortOrder: 4 },
  { slug: 'search', label: 'Search Page', sortOrder: 5 },
  { slug: 'products', label: 'Products Page', sortOrder: 6 },
  { slug: 'categories', label: 'Categories Page', sortOrder: 7 },
  { slug: 'cart', label: 'Cart Page', sortOrder: 8 },
  { slug: 'checkout', label: 'Checkout Page', sortOrder: 9 },
  { slug: 'faq', label: 'FAQ Page', sortOrder: 10 },
  { slug: 'privacy-policy', label: 'Privacy Policy', sortOrder: 11 },
  { slug: 'terms-of-service', label: 'Terms of Service', sortOrder: 12 },
  { slug: 'refund-policy', label: 'Refund & Cancellations', sortOrder: 13 },
  { slug: 'shipping-policy', label: 'Shipping Policy', sortOrder: 14 },
  { slug: 'address-details', label: 'Address Details', sortOrder: 15 },
];

@Injectable()
export class SeoPageService implements OnModuleInit {
  constructor(
    @InjectModel(SeoPage.name)
    private seoPageModel: Model<SeoPageDocument>,
    private readonly logger: WinstonLoggerService,
  ) {}

  /**
   * Seed default pages on module initialization if none exist
   */
  async onModuleInit() {
    const count = await this.seoPageModel.countDocuments().exec();
    if (count === 0) {
      this.logger.log(
        'Seeding default SEO pages',
        { count: DEFAULT_SEO_PAGES.length },
        'SeoPageModule',
      );
      await this.seoPageModel.insertMany(DEFAULT_SEO_PAGES);
    }
  }

  /**
   * Create a new SEO page
   */
  async create(input: CreateSeoPageInput): Promise<SeoPageDocument> {
    this.logger.log('Creating SEO page', { input }, 'SeoPageModule');

    const existingPage = await this.seoPageModel
      .findOne({ slug: input.slug })
      .exec();

    if (existingPage) {
      throw new ConflictException(
        `SEO page with slug '${input.slug}' already exists`,
      );
    }

    const seoPage = new this.seoPageModel(input);
    return seoPage.save();
  }

  /**
   * Get all SEO pages (sorted by sortOrder)
   */
  async findAll(): Promise<SeoPageDocument[]> {
    this.logger.log('Fetching all SEO pages', {}, 'SeoPageModule');
    return this.seoPageModel.find().sort({ sortOrder: 1, label: 1 }).exec();
  }

  /**
   * Get all active SEO pages (for dropdown options)
   */
  async findAllActive(): Promise<SeoPageDocument[]> {
    this.logger.log('Fetching active SEO pages', {}, 'SeoPageModule');
    return this.seoPageModel
      .find({ isActive: true })
      .sort({ sortOrder: 1, label: 1 })
      .exec();
  }

  /**
   * Get a single SEO page by ID
   */
  async findOne(id: string): Promise<SeoPageDocument> {
    this.logger.log('Fetching SEO page', { id }, 'SeoPageModule');

    const seoPage = await this.seoPageModel.findById(id).exec();

    if (!seoPage) {
      throw new NotFoundException(`SEO page with ID '${id}' not found`);
    }

    return seoPage;
  }

  /**
   * Get a SEO page by slug
   */
  async findBySlug(slug: string): Promise<SeoPageDocument> {
    this.logger.log('Fetching SEO page by slug', { slug }, 'SeoPageModule');

    const seoPage = await this.seoPageModel.findOne({ slug }).exec();

    if (!seoPage) {
      throw new NotFoundException(`SEO page with slug '${slug}' not found`);
    }

    return seoPage;
  }

  /**
   * Update a SEO page
   */
  async update(
    id: string,
    input: UpdateSeoPageInput,
  ): Promise<SeoPageDocument> {
    this.logger.log('Updating SEO page', { id, input }, 'SeoPageModule');

    const existingPage = await this.findOne(id);

    // Check for slug uniqueness if updating slug
    if (input.slug && input.slug !== existingPage.slug) {
      const duplicatePage = await this.seoPageModel
        .findOne({ slug: input.slug })
        .exec();

      if (duplicatePage) {
        throw new ConflictException(
          `SEO page with slug '${input.slug}' already exists`,
        );
      }
    }

    Object.assign(existingPage, input);
    return existingPage.save();
  }

  /**
   * Delete a SEO page
   */
  async delete(id: string): Promise<boolean> {
    this.logger.log('Deleting SEO page', { id }, 'SeoPageModule');

    const result = await this.seoPageModel.findByIdAndDelete(id).exec();

    if (!result) {
      throw new NotFoundException(`SEO page with ID '${id}' not found`);
    }

    return true;
  }

  /**
   * Toggle active status
   */
  async toggleActive(id: string): Promise<SeoPageDocument> {
    this.logger.log('Toggling SEO page active status', { id }, 'SeoPageModule');

    const seoPage = await this.findOne(id);
    seoPage.isActive = !seoPage.isActive;
    return seoPage.save();
  }

  /**
   * Reorder pages
   */
  async reorder(
    updates: { id: string; sortOrder: number }[],
  ): Promise<SeoPageDocument[]> {
    this.logger.log(
      'Reordering SEO pages',
      { count: updates.length },
      'SeoPageModule',
    );

    const bulkOps = updates.map((update) => ({
      updateOne: {
        filter: { _id: update.id },
        update: { $set: { sortOrder: update.sortOrder } },
      },
    }));

    await this.seoPageModel.bulkWrite(bulkOps);

    return this.findAll();
  }
}
