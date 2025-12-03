import { Resolver, Query } from '@nestjs/graphql';
import { DashboardService } from './dashboard.service';
import { DashboardStats } from './dashboard.schema';

@Resolver()
export class DashboardResolver {
  constructor(private readonly dashboardService: DashboardService) {}

  @Query(() => DashboardStats, { name: 'dashboardStats' })
  async getDashboardStats(): Promise<DashboardStats> {
    return this.dashboardService.getStats();
  }
}
