import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { SeoContent, SeoContentDocument } from './seo-content.schema';
import {
  CreateSeoContentInput,
  UpdateSeoContentInput,
} from './seo-content.input';
import { WinstonLoggerService } from '../logger/logger.service';
import { PaginationResult } from '../common/pagination';

@Injectable()
export class SeoContentService {
  constructor(
    @InjectModel(SeoContent.name)
    private seoContentModel: Model<SeoContentDocument>,
    private readonly logger: WinstonLoggerService,
  ) {}

  /**
   * Create a new SEO content entry
   */
  async create(input: CreateSeoContentInput): Promise<SeoContentDocument> {
    this.logger.log('Creating SEO content', { input }, 'SeoContentModule');

    // Check if pageSlug already exists
    const existingContent = await this.seoContentModel
      .findOne({ pageSlug: input.pageSlug })
      .exec();

    if (existingContent) {
      throw new ConflictException(
        `SEO content for page slug '${input.pageSlug}' already exists`,
      );
    }

    const seoContent = new this.seoContentModel(input);
    return seoContent.save();
  }

  /**
   * Get all SEO contents with pagination
   */
  async findAllPaginated(
    page: number = 1,
    limit: number = 10,
  ): Promise<PaginationResult<SeoContentDocument>> {
    this.logger.log(
      'Fetching paginated SEO contents',
      { page, limit },
      'SeoContentModule',
    );

    const skip = (page - 1) * limit;

    const [items, totalCount] = await Promise.all([
      this.seoContentModel
        .find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.seoContentModel.countDocuments().exec(),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    return {
      items,
      meta: {
        totalCount,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  /**
   * Get all SEO contents without pagination
   */
  async findAll(): Promise<SeoContentDocument[]> {
    this.logger.log('Fetching all SEO contents', {}, 'SeoContentModule');
    return this.seoContentModel.find().sort({ createdAt: -1 }).exec();
  }

  /**
   * Get a single SEO content by ID
   */
  async findOne(id: string): Promise<SeoContentDocument> {
    this.logger.log('Fetching SEO content', { id }, 'SeoContentModule');

    const seoContent = await this.seoContentModel.findById(id).exec();

    if (!seoContent) {
      throw new NotFoundException(`SEO content with ID '${id}' not found`);
    }

    return seoContent;
  }

  /**
   * Get SEO content by page slug (for public use)
   */
  async findBySlug(slug: string): Promise<SeoContentDocument> {
    this.logger.log(
      'Fetching SEO content by slug',
      { slug },
      'SeoContentModule',
    );

    const seoContent = await this.seoContentModel
      .findOne({ pageSlug: slug, isActive: true })
      .exec();

    if (!seoContent) {
      throw new NotFoundException(
        `SEO content for page '${slug}' not found or not active`,
      );
    }

    return seoContent;
  }

  /**
   * Get all active SEO contents
   */
  async findAllActive(): Promise<SeoContentDocument[]> {
    this.logger.log(
      'Fetching all active SEO contents',
      {},
      'SeoContentModule',
    );

    return this.seoContentModel
      .find({ isActive: true })
      .sort({ createdAt: -1 })
      .exec();
  }

  /**
   * Update SEO content
   */
  async update(
    id: string,
    input: UpdateSeoContentInput,
  ): Promise<SeoContentDocument> {
    this.logger.log('Updating SEO content', { id, input }, 'SeoContentModule');

    // Check if the content exists
    const existingContent = await this.findOne(id);

    // If pageSlug is being updated, check for uniqueness
    if (input.pageSlug && input.pageSlug !== existingContent.pageSlug) {
      const duplicateContent = await this.seoContentModel
        .findOne({ pageSlug: input.pageSlug })
        .exec();

      if (duplicateContent) {
        throw new ConflictException(
          `SEO content for page slug '${input.pageSlug}' already exists`,
        );
      }
    }

    Object.assign(existingContent, input);
    return existingContent.save();
  }

  /**
   * Delete SEO content
   */
  async delete(id: string): Promise<boolean> {
    this.logger.log('Deleting SEO content', { id }, 'SeoContentModule');

    const result = await this.seoContentModel.findByIdAndDelete(id).exec();

    if (!result) {
      throw new NotFoundException(`SEO content with ID '${id}' not found`);
    }

    return true;
  }

  /**
   * Toggle active status of SEO content
   */
  async toggleActive(id: string): Promise<SeoContentDocument> {
    this.logger.log(
      'Toggling SEO content active status',
      { id },
      'SeoContentModule',
    );

    const seoContent = await this.findOne(id);
    seoContent.isActive = !seoContent.isActive;
    return seoContent.save();
  }

  /**
   * Bulk create or update SEO contents (useful for initial setup)
   */
  async upsertMany(
    inputs: CreateSeoContentInput[],
  ): Promise<SeoContentDocument[]> {
    this.logger.log(
      'Bulk upserting SEO contents',
      { count: inputs.length },
      'SeoContentModule',
    );

    const results: SeoContentDocument[] = [];

    for (const input of inputs) {
      const existing = await this.seoContentModel
        .findOne({ pageSlug: input.pageSlug })
        .exec();

      if (existing) {
        Object.assign(existing, input);
        results.push(await existing.save());
      } else {
        const newContent = new this.seoContentModel(input);
        results.push(await newContent.save());
      }
    }

    return results;
  }
}
