import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { FooterDetailService } from './footer-detail.service';
import { FooterDetail } from './footer-detail.graphql';
import { CreateFooterDetailInput, UpdateFooterDetailInput } from './footer-detail.input';
import { Public } from '../common/decorators/public.decorator';
import { Role } from '../common/enums/role.enum';
import { Roles } from '../common/decorators/roles.decorator';

@Resolver(() => FooterDetail)
export class FooterDetailResolver {
  constructor(private readonly footerDetailService: FooterDetailService) {}

  @Query(() => [FooterDetail], { name: 'footerDetails' })
  @Public()
  async getFooterDetails(): Promise<FooterDetail[]> {
    return this.footerDetailService.findAll();
  }

  @Query(() => [FooterDetail], { name: 'activeFooterDetails' })
  @Public()
  async getActiveFooterDetails(): Promise<FooterDetail[]> {
    return this.footerDetailService.findActive();
  }

  @Query(() => FooterDetail, { name: 'footerDetail', nullable: true })
  @Public()
  async getFooterDetail(
    @Args('id', { type: () => ID }) id: string,
  ): Promise<FooterDetail | null> {
    try {
      return await this.footerDetailService.findOne(id);
    } catch {
      return null;
    }
  }

  @Mutation(() => FooterDetail, { name: 'createFooterDetail' })
  @Roles(Role.ADMIN)
  async createFooterDetail(
    @Args('input') input: CreateFooterDetailInput,
  ): Promise<FooterDetail> {
    return this.footerDetailService.create(input);
  }

  @Mutation(() => FooterDetail, { name: 'updateFooterDetail' })
  @Roles(Role.ADMIN)
  async updateFooterDetail(
    @Args('id', { type: () => ID }) id: string,
    @Args('input') input: UpdateFooterDetailInput,
  ): Promise<FooterDetail> {
    return this.footerDetailService.update(id, input);
  }

  @Mutation(() => FooterDetail, { name: 'deleteFooterDetail' })
  @Roles(Role.ADMIN)
  async deleteFooterDetail(
    @Args('id', { type: () => ID }) id: string,
  ): Promise<FooterDetail> {
    return this.footerDetailService.remove(id);
  }
}
