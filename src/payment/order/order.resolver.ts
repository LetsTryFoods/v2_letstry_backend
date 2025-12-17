import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { OrderService } from './order.service';
import { GetMyOrdersInput, CancelOrderInput, GetAllOrdersInput } from './order.input';
import { OrderType, PaginatedOrdersResponse, AdminOrdersResponse } from './order.graphql';
import { DualAuthGuard } from '../../authentication/common/dual-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { OptionalUser } from '../../common/decorators/optional-user.decorator';

@Resolver()
export class OrderResolver {
  constructor(private readonly orderService: OrderService) {}

  @Query(() => PaginatedOrdersResponse)
  @Roles(Role.ADMIN, Role.USER)
  @UseGuards(DualAuthGuard, RolesGuard)
  async getMyOrders(
    @Args('input') input: GetMyOrdersInput,
    @OptionalUser() user: any,
  ): Promise<any> {
    if (!user?._id) {
      throw new Error('User identification required');
    }

    if (user.isGuest || user.role === Role.GUEST) {
      throw new Error('Guest users cannot access orders. Please log in to view your orders.');
    }

    const mergedGuestIds = user.mergedGuestIds || [];

    const result = await this.orderService.getOrdersByIdentity({
      identityId: user._id,
      mergedGuestIds,
      page: input.page,
      limit: input.limit,
      status: input.status,
    });

    return {
      ...result,
      orders: result.orders.map(o => o.toObject ? o.toObject() : o),
    };
  }

  @Query(() => AdminOrdersResponse)
  @Roles(Role.ADMIN)
  @UseGuards(RolesGuard)
  async getAllOrders(
    @Args('input') input: GetAllOrdersInput,
  ): Promise<AdminOrdersResponse> {
    return this.orderService.getAllOrdersForAdmin(input);
  }

  @Query(() => OrderType)
  @Roles(Role.ADMIN, Role.USER)
  @UseGuards(DualAuthGuard, RolesGuard)
  async getOrderById(
    @Args('orderId') orderId: string,
    @OptionalUser() user: any,
  ): Promise<any> {
    if (!user?._id) {
      throw new Error('User identification required');
    }

    if (user.isGuest || user.role === Role.GUEST) {
      throw new Error('Guest users cannot access orders. Please log in to view order details.');
    }

    const order = await this.orderService.getOrderById(orderId);
    return order.toObject ? order.toObject() : order;
  }

  @Mutation(() => OrderType)
  @Roles(Role.ADMIN, Role.USER)
  @UseGuards(DualAuthGuard, RolesGuard)
  async cancelOrder(
    @Args('input') input: CancelOrderInput,
    @OptionalUser() user: any,
  ): Promise<any> {
    if (!user?._id) {
      throw new Error('User identification required');
    }

    if (user.isGuest || user.role === Role.GUEST) {
      throw new Error('Guest users cannot cancel orders. Please log in to manage your orders.');
    }

    const order = await this.orderService.cancelOrder({
      orderId: input.orderId,
      reason: input.reason || 'Cancelled by user',
    });
    return order.toObject ? order.toObject() : order;
  }
}
