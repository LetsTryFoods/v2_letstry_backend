import { Resolver, Query } from '@nestjs/graphql';
import { DashboardService } from './dashboard.service';
import { DashboardStats } from './dashboard.schema';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';

@Resolver()
export class DashboardResolver {
  constructor(private readonly dashboardService: DashboardService) {}

  @Query(() => DashboardStats, { name: 'dashboardStats' })
  @Roles(Role.ADMIN)
  async getDashboardStats(): Promise<DashboardStats> {
    return this.dashboardService.getStats();
  }
}
