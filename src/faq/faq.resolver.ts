import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { FAQService } from './faq.service';
import { FAQ, FAQCategory } from './faq.schema';
import { CreateFAQInput, UpdateFAQInput, FAQFilterInput } from './faq.input';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { Role } from '../common/enums/role.enum';


@Resolver(() => FAQ)
export class FAQResolver {
  constructor(private readonly faqService: FAQService) {}

  // ==================== PUBLIC QUERIES ====================

  @Public()
  @Query(() => [FAQ], { name: 'activeFAQs', description: 'Get all active FAQs (public)' })
  async getActiveFAQs(
    @Args('category', { type: () => FAQCategory, nullable: true }) category?: FAQCategory,
  ): Promise<FAQ[]> {
    return this.faqService.findActive(category);
  }

  // ==================== ADMIN QUERIES ====================

  @Query(() => [FAQ], { name: 'faqs', description: 'Get all FAQs with optional filters (admin)' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async getFAQs(
    @Args('filter', { type: () => FAQFilterInput, nullable: true }) filter?: FAQFilterInput,
  ): Promise<FAQ[]> {
    return this.faqService.findAll(filter);
  }

  @Query(() => FAQ, { name: 'faq', description: 'Get single FAQ by ID' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async getFAQ(
    @Args('id', { type: () => ID }) id: string,
  ): Promise<FAQ> {
    return this.faqService.findById(id);
  }

  // ==================== ADMIN MUTATIONS ====================

  @Mutation(() => FAQ, { name: 'createFAQ', description: 'Create a new FAQ' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async createFAQ(
    @Args('input') input: CreateFAQInput,
  ): Promise<FAQ> {
    return this.faqService.create(input);
  }

  @Mutation(() => FAQ, { name: 'updateFAQ', description: 'Update an existing FAQ' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async updateFAQ(
    @Args('input') input: UpdateFAQInput,
  ): Promise<FAQ> {
    return this.faqService.update(input);
  }

  @Mutation(() => Boolean, { name: 'deleteFAQ', description: 'Delete a FAQ' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async deleteFAQ(
    @Args('id', { type: () => ID }) id: string,
  ): Promise<boolean> {
    return this.faqService.delete(id);
  }

  @Mutation(() => FAQ, { name: 'toggleFAQStatus', description: 'Toggle FAQ active/inactive status' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async toggleFAQStatus(
    @Args('id', { type: () => ID }) id: string,
  ): Promise<FAQ> {
    return this.faqService.toggleStatus(id);
  }

  @Mutation(() => Boolean, { name: 'reorderFAQs', description: 'Reorder FAQs' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async reorderFAQs(
    @Args('ids', { type: () => [ID] }) ids: string[],
  ): Promise<boolean> {
    return this.faqService.reorder(ids);
  }
}
