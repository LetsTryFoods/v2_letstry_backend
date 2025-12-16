import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { SeoContentService } from './seo-content.service';
import { SeoContent } from './seo-content.schema';
import {
  CreateSeoContentInput,
  UpdateSeoContentInput,
} from './seo-content.input';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { Public } from '../common/decorators/public.decorator';
import { PaginatedSeoContents } from './seo-content.pagination';
import { PaginationInput } from '../common/pagination';

@Resolver(() => SeoContent)
export class SeoContentResolver {
  constructor(private readonly seoContentService: SeoContentService) {}

  /**
   * Get all SEO contents with pagination (Admin)
   */
  @Query(() => PaginatedSeoContents, { name: 'seoContents' })
  @UseGuards(JwtAuthGuard)
  @Roles(Role.ADMIN)
  async getSeoContents(
    @Args('pagination', {
      type: () => PaginationInput,
      defaultValue: { page: 1, limit: 10 },
    })
    pagination: PaginationInput,
  ): Promise<PaginatedSeoContents> {
    const result = await this.seoContentService.findAllPaginated(
      pagination.page,
      pagination.limit,
    );
    return {
      items: result.items as SeoContent[],
      meta: result.meta,
    };
  }

  /**
   * Get a single SEO content by ID (Admin)
   */
  @Query(() => SeoContent, { name: 'seoContent' })
  @UseGuards(JwtAuthGuard)
  @Roles(Role.ADMIN)
  async getSeoContent(
    @Args('id', { type: () => ID }) id: string,
  ): Promise<SeoContent> {
    return this.seoContentService.findOne(id);
  }

  /**
   * Get SEO content by page slug (Public - for frontend SEO)
   */
  @Query(() => SeoContent, { name: 'seoContentBySlug', nullable: true })
  @Public()
  async getSeoContentBySlug(
    @Args('slug', { type: () => String }) slug: string,
  ): Promise<SeoContent | null> {
    try {
      return await this.seoContentService.findBySlug(slug);
    } catch {
      return null;
    }
  }

  /**
   * Get all active SEO contents (Public - for sitemap generation)
   */
  @Query(() => [SeoContent], { name: 'activeSeoContents' })
  @Public()
  async getActiveSeoContents(): Promise<SeoContent[]> {
    return this.seoContentService.findAllActive();
  }

  /**
   * Create a new SEO content (Admin)
   */
  @Mutation(() => SeoContent, { name: 'createSeoContent' })
  @UseGuards(JwtAuthGuard)
  @Roles(Role.ADMIN)
  async createSeoContent(
    @Args('input') input: CreateSeoContentInput,
  ): Promise<SeoContent> {
    return this.seoContentService.create(input);
  }

  /**
   * Update SEO content (Admin)
   */
  @Mutation(() => SeoContent, { name: 'updateSeoContent' })
  @UseGuards(JwtAuthGuard)
  @Roles(Role.ADMIN)
  async updateSeoContent(
    @Args('id', { type: () => ID }) id: string,
    @Args('input') input: UpdateSeoContentInput,
  ): Promise<SeoContent> {
    return this.seoContentService.update(id, input);
  }

  /**
   * Delete SEO content (Admin)
   */
  @Mutation(() => Boolean, { name: 'deleteSeoContent' })
  @UseGuards(JwtAuthGuard)
  @Roles(Role.ADMIN)
  async deleteSeoContent(
    @Args('id', { type: () => ID }) id: string,
  ): Promise<boolean> {
    return this.seoContentService.delete(id);
  }

  /**
   * Toggle active status of SEO content (Admin)
   */
  @Mutation(() => SeoContent, { name: 'toggleSeoContentActive' })
  @UseGuards(JwtAuthGuard)
  @Roles(Role.ADMIN)
  async toggleSeoContentActive(
    @Args('id', { type: () => ID }) id: string,
  ): Promise<SeoContent> {
    return this.seoContentService.toggleActive(id);
  }

  /**
   * Bulk upsert SEO contents (Admin - for initial setup)
   */
  @Mutation(() => [SeoContent], { name: 'upsertSeoContents' })
  @UseGuards(JwtAuthGuard)
  @Roles(Role.ADMIN)
  async upsertSeoContents(
    @Args('inputs', { type: () => [CreateSeoContentInput] })
    inputs: CreateSeoContentInput[],
  ): Promise<SeoContent[]> {
    return this.seoContentService.upsertMany(inputs);
  }
}
