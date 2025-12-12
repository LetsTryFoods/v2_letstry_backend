import { Resolver, Query, Mutation, Args, Context, ID } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { CartService } from './cart.service';
import { Cart } from './cart.schema';
import { AddToCartInput, UpdateCartItemInput } from './cart.input';
import { Public } from '../common/decorators/public.decorator';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt-auth.guard';
import { OptionalUser } from '../common/decorators/optional-user.decorator';

@Resolver(() => Cart)
export class CartResolver {
  constructor(private readonly cartService: CartService) {}

  private getSessionId(context: any): string | undefined {
    const structuredCookie = context.req?.cookies?.guest_session;
    if (structuredCookie?.sessionId) {
      return structuredCookie.sessionId;
    }
    return context.req?.cookies?.sessionId;
  }

  @Query(() => Cart, { name: 'myCart', nullable: true })
  @Public()
  @UseGuards(OptionalJwtAuthGuard)
  async getMyCart(
    @Context() context: any,
    @OptionalUser() user: any,
  ): Promise<Cart | null> {
    const userId = user?._id;
    const sessionId = this.getSessionId(context);
    return this.cartService.getCart(userId, sessionId);
  }

  @Mutation(() => Cart, { name: 'addToCart' })
  @Public()
  @UseGuards(OptionalJwtAuthGuard)
  async addToCart(
    @Args('input') input: AddToCartInput,
    @Context() context: any,
    @OptionalUser() user: any,
  ): Promise<Cart> {
    const userId = user?._id;
    const sessionId = this.getSessionId(context);
    return this.cartService.addToCart(userId, sessionId, input);
  }

  @Mutation(() => Cart, { name: 'updateCartItem' })
  @Public()
  @UseGuards(OptionalJwtAuthGuard)
  async updateCartItem(
    @Args('input') input: UpdateCartItemInput,
    @Context() context: any,
    @OptionalUser() user: any,
  ): Promise<Cart> {
    const userId = user?._id;
    const sessionId = this.getSessionId(context);
    return this.cartService.updateCartItem(userId, sessionId, input);
  }

  @Mutation(() => Cart, { name: 'removeFromCart' })
  @Public()
  @UseGuards(OptionalJwtAuthGuard)
  async removeFromCart(
    @Args('productId', { type: () => ID }) productId: string,
    @Context() context: any,
    @OptionalUser() user: any,
  ): Promise<Cart> {
    const userId = user?._id;
    const sessionId = this.getSessionId(context);
    return this.cartService.removeFromCart(userId, sessionId, productId);
  }

  @Mutation(() => Cart, { name: 'clearCart' })
  @Public()
  @UseGuards(OptionalJwtAuthGuard)
  async clearCart(
    @Context() context: any,
    @OptionalUser() user: any,
  ): Promise<Cart> {
    const userId = user?._id;
    const sessionId = this.getSessionId(context);
    return this.cartService.clearCart(userId, sessionId);
  }

  @Mutation(() => Cart, { name: 'applyCoupon' })
  @Public()
  @UseGuards(OptionalJwtAuthGuard)
  async applyCoupon(
    @Args('code') code: string,
    @Context() context: any,
    @OptionalUser() user: any,
  ): Promise<Cart> {
    const userId = user?._id;
    const sessionId = this.getSessionId(context);
    return this.cartService.applyCoupon(userId, sessionId, code);
  }

  @Mutation(() => Cart, { name: 'removeCoupon' })
  @Public()
  @UseGuards(OptionalJwtAuthGuard)
  async removeCoupon(
    @Context() context: any,
    @OptionalUser() user: any,
  ): Promise<Cart> {
    const userId = user?._id;
    const sessionId = this.getSessionId(context);
    return this.cartService.removeCoupon(userId, sessionId);
  }
}
