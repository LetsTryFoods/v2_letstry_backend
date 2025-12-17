import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { UserService } from './user.service';
import { GetCustomersInput } from './user.input';
import { PaginatedCustomersResponse, CustomerDetails } from './user.graphql';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { RolesGuard } from '../common/guards/roles.guard';
import { DualAuthGuard } from '../authentication/common/dual-auth.guard';
import { OptionalUser } from '../common/decorators/optional-user.decorator';

@Resolver()
export class UserResolver {
  constructor(private readonly userService: UserService) {}

  @Query(() => PaginatedCustomersResponse)
  @Roles(Role.ADMIN)
  @UseGuards(RolesGuard)
  async getAllCustomers(
    @Args('input') input: GetCustomersInput,
  ): Promise<PaginatedCustomersResponse> {
    return this.userService.getAllCustomers(input);
  }

  @Query(() => CustomerDetails)
  @Roles(Role.ADMIN)
  @UseGuards(RolesGuard)
  async getCustomerDetails(
    @Args('id', { type: () => ID }) id: string,
  ): Promise<CustomerDetails> {
    return this.userService.getCustomerDetails(id);
  }

  @Mutation(() => Boolean)
  @Roles(Role.USER)
  @UseGuards(DualAuthGuard, RolesGuard)
  async updateUserActivity(@OptionalUser() user: any): Promise<boolean> {
    if (!user?._id) {
      throw new Error('User identification required');
    }

    if (user.isGuest || user.role === Role.GUEST) {
      throw new Error('Guest users should use updateGuest mutation');
    }

    return this.userService.updateUserActivity(user._id);
  }
}
