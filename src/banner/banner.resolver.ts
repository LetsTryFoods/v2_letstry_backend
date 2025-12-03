import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { BannerService } from './banner.service';
import { Banner } from './banner.graphql';
import { CreateBannerInput, UpdateBannerInput } from './banner.input';
import { Public } from '../admin/auth/public.decorator';

@Resolver(() => Banner)
export class BannerResolver {
  constructor(private readonly bannerService: BannerService) {}

  @Query(() => [Banner], { name: 'banners' })
  @Public()
  async getBanners(): Promise<Banner[]> {
    return this.bannerService.findAll();
  }

  @Query(() => [Banner], { name: 'activeBanners' })
  @Public()
  async getActiveBanners(): Promise<Banner[]> {
    return this.bannerService.findActive();
  }

  @Query(() => Banner, { name: 'banner', nullable: true })
  @Public()
  async getBanner(
    @Args('id', { type: () => ID }) id: string,
  ): Promise<Banner | null> {
    try {
      return await this.bannerService.findOne(id);
    } catch {
      return null;
    }
  }

  @Mutation(() => Banner, { name: 'createBanner' })
  async createBanner(@Args('input') input: CreateBannerInput): Promise<Banner> {
    return this.bannerService.create(input);
  }

  @Mutation(() => Banner, { name: 'updateBanner' })
  async updateBanner(
    @Args('id', { type: () => ID }) id: string,
    @Args('input') input: UpdateBannerInput,
  ): Promise<Banner> {
    return this.bannerService.update(id, input);
  }

  @Mutation(() => Banner, { name: 'deleteBanner' })
  async deleteBanner(
    @Args('id', { type: () => ID }) id: string,
  ): Promise<Banner> {
    return this.bannerService.remove(id);
  }
}
