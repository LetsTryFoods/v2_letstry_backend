import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { SeoPageService } from './seo-page.service';
import { SeoPage } from './seo-page.schema';
import { CreateSeoPageInput, UpdateSeoPageInput } from './seo-page.input';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { Public } from '../common/decorators/public.decorator';

@Resolver(() => SeoPage)
export class SeoPageResolver {
  constructor(private readonly seoPageService: SeoPageService) {}

  /**
   * Get all SEO pages (Admin)
   */
  @Query(() => [SeoPage], { name: 'seoPages' })
  @UseGuards(JwtAuthGuard)
  @Roles(Role.ADMIN)
  async getSeoPages(): Promise<SeoPage[]> {
    return this.seoPageService.findAll();
  }

  /**
   * Get all active SEO pages (for dropdown - Public for admin forms)
   */
  @Query(() => [SeoPage], { name: 'activeSeoPages' })
  @UseGuards(JwtAuthGuard)
  @Roles(Role.ADMIN)
  async getActiveSeoPages(): Promise<SeoPage[]> {
    return this.seoPageService.findAllActive();
  }

  /**
   * Get a single SEO page by ID (Admin)
   */
  @Query(() => SeoPage, { name: 'seoPage' })
  @UseGuards(JwtAuthGuard)
  @Roles(Role.ADMIN)
  async getSeoPage(
    @Args('id', { type: () => ID }) id: string,
  ): Promise<SeoPage> {
    return this.seoPageService.findOne(id);
  }

  /**
   * Create a new SEO page (Admin)
   */
  @Mutation(() => SeoPage, { name: 'createSeoPage' })
  @UseGuards(JwtAuthGuard)
  @Roles(Role.ADMIN)
  async createSeoPage(
    @Args('input') input: CreateSeoPageInput,
  ): Promise<SeoPage> {
    return this.seoPageService.create(input);
  }

  /**
   * Update a SEO page (Admin)
   */
  @Mutation(() => SeoPage, { name: 'updateSeoPage' })
  @UseGuards(JwtAuthGuard)
  @Roles(Role.ADMIN)
  async updateSeoPage(
    @Args('id', { type: () => ID }) id: string,
    @Args('input') input: UpdateSeoPageInput,
  ): Promise<SeoPage> {
    return this.seoPageService.update(id, input);
  }

  /**
   * Delete a SEO page (Admin)
   */
  @Mutation(() => Boolean, { name: 'deleteSeoPage' })
  @UseGuards(JwtAuthGuard)
  @Roles(Role.ADMIN)
  async deleteSeoPage(
    @Args('id', { type: () => ID }) id: string,
  ): Promise<boolean> {
    return this.seoPageService.delete(id);
  }

  /**
   * Toggle active status (Admin)
   */
  @Mutation(() => SeoPage, { name: 'toggleSeoPageActive' })
  @UseGuards(JwtAuthGuard)
  @Roles(Role.ADMIN)
  async toggleSeoPageActive(
    @Args('id', { type: () => ID }) id: string,
  ): Promise<SeoPage> {
    return this.seoPageService.toggleActive(id);
  }
}
