import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { OrderService } from './order.service';
import { GetMyOrdersInput, CancelOrderInput } from './order.input';
import { OrderType, PaginatedOrdersResponse } from './order.graphql';
import { Public } from '../../common/decorators/public.decorator';
import { DualAuthGuard } from '../../authentication/common/dual-auth.guard';
import { OptionalUser } from '../../common/decorators/optional-user.decorator';

@Resolver()
export class OrderResolver {
  constructor(private readonly orderService: OrderService) {}

  @Query(() => PaginatedOrdersResponse)
  @Public()
  @UseGuards(DualAuthGuard)
  async getMyOrders(
    @Args('input') input: GetMyOrdersInput,
    @OptionalUser() user: any,
  ): Promise<any> {
    if (!user?._id) {
      throw new Error('User identification required');
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

  @Query(() => OrderType)
  @Public()
  @UseGuards(DualAuthGuard)
  async getOrderById(
    @Args('orderId') orderId: string,
    @OptionalUser() user: any,
  ): Promise<any> {
    if (!user?._id) {
      throw new Error('User identification required');
    }

    const order = await this.orderService.getOrderById(orderId);
    return order.toObject ? order.toObject() : order;
  }

  @Mutation(() => OrderType)
  @Public()
  @UseGuards(DualAuthGuard)
  async cancelOrder(
    @Args('input') input: CancelOrderInput,
    @OptionalUser() user: any,
  ): Promise<any> {
    if (!user?._id) {
      throw new Error('User identification required');
    }

    const order = await this.orderService.cancelOrder({
      orderId: input.orderId,
      reason: input.reason || 'Cancelled by user',
    });
    return order.toObject ? order.toObject() : order;
  }
}
