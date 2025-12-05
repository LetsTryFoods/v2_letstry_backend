import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Cart, CartDocument, CartStatus, CartItem } from './cart.schema';
import { ProductService } from '../product/product.service';
import { WinstonLoggerService } from '../logger/logger.service';
import { AddToCartInput, UpdateCartItemInput } from './cart.input';
import { CouponService } from '../coupon/coupon.service';
import { DiscountType, ApplicationScope } from '../coupon/coupon.schema';

@Injectable()
export class CartService {
  constructor(
    @InjectModel(Cart.name) private cartModel: Model<CartDocument>,
    private readonly productService: ProductService,
    private readonly logger: WinstonLoggerService,
    private readonly couponService: CouponService,
  ) {}

  private getCartFilter(userId?: string, sessionId?: string) {
    if (userId) return { user_id: userId, status: CartStatus.ACTIVE };
    if (sessionId) return { session_id: sessionId, status: CartStatus.ACTIVE };
    return null;
  }

  async getCart(userId?: string, sessionId?: string): Promise<CartDocument | null> {
    const filter = this.getCartFilter(userId, sessionId);
    if (!filter) return null;

    this.logger.log('Fetching cart', { userId, sessionId }, 'CartModule');
    return this.cartModel.findOne(filter).exec();
  }

  async addToCart(userId: string | undefined, sessionId: string | undefined, input: AddToCartInput): Promise<CartDocument> {
    this.logger.log('Adding to cart', { userId, sessionId, input }, 'CartModule');
    
    let cart = await this.getCart(userId, sessionId);

    if (!cart) {
      this.logger.log('Cart not found, creating new one', { userId, sessionId }, 'CartModule');
      cart = new this.cartModel({
        user_id: userId,
        session_id: sessionId,
        status: CartStatus.ACTIVE,
        items: [],
      });
    }

    const product = await this.productService.findOne(input.productId);
    if (!product) {
      this.logger.error('Product not found', { productId: input.productId }, 'CartModule');
      throw new NotFoundException('Product not found');
    }

    const newItem: CartItem = {
      product_id: product._id,
      sku: product.sku || 'N/A',
      name: product.name,
      quantity: input.quantity,
      unit_price: product.price,
      mrp: product.mrp,
      total_price: product.price * input.quantity,
      image_url: product.images?.[0]?.url,
      attributes: input.attributes,
    };

    this.upsertCartItem(cart.items, newItem);

    await this.recalculateCart(cart);
    const savedCart = await cart.save();
    this.logger.log('Item added to cart', { cartId: savedCart._id }, 'CartModule');
    return savedCart;
  }

  async updateCartItem(userId: string | undefined, sessionId: string | undefined, input: UpdateCartItemInput): Promise<CartDocument> {
    this.logger.log('Updating cart item', { userId, sessionId, input }, 'CartModule');
    const cart = await this.getCartOrThrow(userId, sessionId);

    const itemIndex = cart.items.findIndex((item) => item.product_id.toString() === input.productId);
    if (itemIndex === -1) {
      throw new NotFoundException('Item not found in cart');
    }

    if (input.quantity === 0) {
      cart.items.splice(itemIndex, 1);
    } else {
      cart.items[itemIndex].quantity = input.quantity;
      cart.items[itemIndex].total_price = cart.items[itemIndex].quantity * cart.items[itemIndex].unit_price;
    }

    await this.recalculateCart(cart);
    return cart.save();
  }

  async removeFromCart(userId: string | undefined, sessionId: string | undefined, productId: string): Promise<CartDocument> {
    this.logger.log('Removing from cart', { userId, sessionId, productId }, 'CartModule');
    const cart = await this.getCartOrThrow(userId, sessionId);

    cart.items = cart.items.filter((item) => item.product_id.toString() !== productId);
    await this.recalculateCart(cart);
    return cart.save();
  }

  async clearCart(userId?: string, sessionId?: string): Promise<CartDocument> {
    this.logger.log('Clearing cart', { userId, sessionId }, 'CartModule');
    const cart = await this.getCartOrThrow(userId, sessionId);
    cart.items = [];
    await this.recalculateCart(cart);
    return cart.save();
  }

  async mergeCarts(userId: string, sessionId: string): Promise<void> {
    this.logger.log('Merging carts', { userId, sessionId }, 'CartModule');
    const guestCart = await this.cartModel.findOne({ session_id: sessionId, status: CartStatus.ACTIVE });
    const userCart = await this.cartModel.findOne({ user_id: userId, status: CartStatus.ACTIVE });

    if (!guestCart) {
      this.logger.log('No guest cart to merge', { sessionId }, 'CartModule');
      return;
    }

    if (!userCart) {
      this.logger.log('No existing user cart, adopting guest cart', { userId, sessionId }, 'CartModule');
      guestCart.user_id = userId;
      guestCart.session_id = undefined;
      await guestCart.save();
      return;
    }

    this.logger.log('Merging guest items into user cart', { guestCartId: guestCart._id, userCartId: userCart._id }, 'CartModule');
    
    for (const guestItem of guestCart.items) {
      this.upsertCartItem(userCart.items, guestItem);
    }

    await this.recalculateCart(userCart);
    await userCart.save();
    
    guestCart.status = CartStatus.MERGED;
    await guestCart.save();
    this.logger.log('Carts merged successfully', { userId }, 'CartModule');
  }

  async applyCoupon(userId: string | undefined, sessionId: string | undefined, code: string): Promise<CartDocument> {
    this.logger.log('Applying coupon', { userId, sessionId, code }, 'CartModule');
    const cart = await this.getCartOrThrow(userId, sessionId);

    try {
      await this.couponService.validateCoupon(code, cart.totals_summary.subtotal);
    } catch (error) {
      throw new BadRequestException(error.message);
    }

    cart.coupon_code = code;
    await this.recalculateCart(cart);
    return cart.save();
  }

  async removeCoupon(userId: string | undefined, sessionId: string | undefined): Promise<CartDocument> {
    this.logger.log('Removing coupon', { userId, sessionId }, 'CartModule');
    const cart = await this.getCartOrThrow(userId, sessionId);

    cart.coupon_code = undefined;
    await this.recalculateCart(cart);
    return cart.save();
  }

  private async recalculateCart(cart: Cart) {
    const subtotal = this.calculateSubtotal(cart.items);
    let discountAmount = 0;

    if (cart.coupon_code) {
      try {
        discountAmount = await this.calculateDiscount(subtotal, cart.items, cart.coupon_code);
      } catch (error) {
        this.logger.warn(`Coupon ${cart.coupon_code} became invalid: ${error.message}`, 'CartModule');
        cart.coupon_code = undefined;
        discountAmount = 0;
      }
    }

    const shippingCost = 0; 
    const estimatedTax = 0; 
    const grandTotal = Math.max(0, subtotal + shippingCost + estimatedTax - discountAmount);

    cart.totals_summary = {
      subtotal,
      discount_amount: discountAmount,
      shipping_cost: shippingCost,
      estimated_tax: estimatedTax,
      grand_total: grandTotal,
    };
  }

  private async getCartOrThrow(userId?: string, sessionId?: string): Promise<CartDocument> {
    const cart = await this.getCart(userId, sessionId);
    if (!cart) {
      throw new NotFoundException('Cart not found');
    }
    return cart;
  }

  private findCartItemIndex(items: CartItem[], productId: string, attributes: any): number {
    return items.findIndex(
      (item) => item.product_id.toString() === productId && JSON.stringify(item.attributes) === JSON.stringify(attributes)
    );
  }

  private upsertCartItem(items: CartItem[], newItem: CartItem) {
    const existingIndex = this.findCartItemIndex(items, newItem.product_id, newItem.attributes);
    if (existingIndex > -1) {
      items[existingIndex].quantity += newItem.quantity;
      items[existingIndex].total_price = items[existingIndex].quantity * items[existingIndex].unit_price;
    } else {
      items.push(newItem);
    }
  }

  private calculateSubtotal(items: CartItem[]): number {
    return items.reduce((sum, item) => sum + item.total_price, 0);
  }

  private async calculateDiscount(subtotal: number, items: CartItem[], couponCode?: string): Promise<number> {
    if (!couponCode) return 0;
    
    const coupon = await this.couponService.validateCoupon(couponCode, subtotal);
    let applicableAmount = subtotal;

    if (coupon.applicationScope === ApplicationScope.ON_PRODUCT_MRP) {
      applicableAmount = items.reduce((sum, item) => sum + (item.mrp * item.quantity), 0);
    } else if (coupon.applicationScope === ApplicationScope.ON_TOTAL_AMOUNT) {
      applicableAmount = subtotal;
    }

    let discountAmount = 0;
    if (coupon.discountType === DiscountType.PERCENTAGE) {
      discountAmount = (applicableAmount * coupon.discountValue) / 100;
      if (coupon.maxDiscountAmount && discountAmount > coupon.maxDiscountAmount) {
        discountAmount = coupon.maxDiscountAmount;
      }
    } else if (coupon.discountType === DiscountType.FIXED) {
      discountAmount = coupon.discountValue;
    }
    
    return Math.min(discountAmount, subtotal);
  }
}
