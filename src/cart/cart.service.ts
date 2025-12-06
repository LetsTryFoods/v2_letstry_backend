import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Cart, CartDocument, CartStatus, CartItem } from './cart.schema';
import { ProductService } from '../product/product.service';
import { WinstonLoggerService } from '../logger/logger.service';
import { AddToCartInput, UpdateCartItemInput } from './cart.input';
import { CouponService } from '../coupon/coupon.service';
import { DiscountType, ApplicationScope } from '../coupon/coupon.schema';
import { ChargesService } from '../charges/charges.service';

@Injectable()
export class CartService {
  constructor(
    @InjectModel(Cart.name) private cartModel: Model<CartDocument>,
    private readonly productService: ProductService,
    private readonly logger: WinstonLoggerService,
    private readonly couponService: CouponService,
    private readonly chargesService: ChargesService,
  ) {}

 

  private getCartFilter(userId?: string, sessionId?: string) {
    if (userId) return { userId: userId, status: CartStatus.ACTIVE };
    if (sessionId) return { sessionId: sessionId, status: CartStatus.ACTIVE };
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
        userId: userId,
        sessionId: sessionId,
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
      productId: product._id,
      sku: product.sku || 'N/A',
      name: product.name,
      quantity: input.quantity,
      unitPrice: product.price,
      mrp: product.mrp,
      totalPrice: product.price * input.quantity,
      imageUrl: product.images?.[0]?.url,
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

    const itemIndex = cart.items.findIndex((item) => item.productId.toString() === input.productId);
    if (itemIndex === -1) {
      throw new NotFoundException('Item not found in cart');
    }

    if (input.quantity === 0) {
      cart.items.splice(itemIndex, 1);
    } else {
      cart.items[itemIndex].quantity = input.quantity;
      cart.items[itemIndex].totalPrice = cart.items[itemIndex].quantity * cart.items[itemIndex].unitPrice;
    }

    await this.recalculateCart(cart);
    return cart.save();
  }

  async removeFromCart(userId: string | undefined, sessionId: string | undefined, productId: string): Promise<CartDocument> {
    this.logger.log('Removing from cart', { userId, sessionId, productId }, 'CartModule');
    const cart = await this.getCartOrThrow(userId, sessionId);

    cart.items = cart.items.filter((item) => item.productId.toString() !== productId);
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
    const guestCart = await this.cartModel.findOne({ sessionId: sessionId, status: CartStatus.ACTIVE });
    const userCart = await this.cartModel.findOne({ userId: userId, status: CartStatus.ACTIVE });

    if (!guestCart) {
      this.logger.log('No guest cart to merge', { sessionId }, 'CartModule');
      return;
    }

    if (!userCart) {
      this.logger.log('No existing user cart, adopting guest cart', { userId, sessionId }, 'CartModule');
      guestCart.userId = userId;
      guestCart.sessionId = undefined;
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
      await this.couponService.validateCoupon(code, cart.totalsSummary.subtotal);
    } catch (error) {
      throw new BadRequestException(error.message);
    }

    cart.couponCode = code;
    await this.recalculateCart(cart);
    return cart.save();
  }

  async removeCoupon(userId: string | undefined, sessionId: string | undefined): Promise<CartDocument> {
    this.logger.log('Removing coupon', { userId, sessionId }, 'CartModule');
    const cart = await this.getCartOrThrow(userId, sessionId);

    cart.couponCode = undefined;
    await this.recalculateCart(cart);
    return cart.save();
  }

 private async recalculateCart(cart: Cart) {
    const subtotal = this.calculateSubtotal(cart.items);
    let discountAmount = 0;

    if (cart.couponCode) {
      try {
        discountAmount = await this.calculateDiscount(subtotal, cart.items, cart.couponCode);
      } catch (error) {
        this.logger.warn(`Coupon ${cart.couponCode} became invalid: ${error.message}`, 'CartModule');
        cart.couponCode = undefined;
        discountAmount = 0;
      }
    }

    const charges = await this.chargesService.getCharges();
    let handlingCharge = 0;

    if (charges && charges.active) {
      handlingCharge = charges.handlingCharge;
    }

    const shippingCost = 0; 
    const estimatedTax = 0; 
    const grandTotal = Math.max(0, subtotal + shippingCost + estimatedTax + handlingCharge - discountAmount);

    cart.totalsSummary = {
      subtotal,
      discountAmount: discountAmount,
      shippingCost: shippingCost,
      estimatedTax: estimatedTax,
      handlingCharge: handlingCharge,
      grandTotal: grandTotal,
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
      (item) => item.productId.toString() === productId && JSON.stringify(item.attributes) === JSON.stringify(attributes)
    );
  }

  private upsertCartItem(items: CartItem[], newItem: CartItem) {
    const existingIndex = this.findCartItemIndex(items, newItem.productId, newItem.attributes);
    if (existingIndex > -1) {
      items[existingIndex].quantity += newItem.quantity;
      items[existingIndex].totalPrice = items[existingIndex].quantity * items[existingIndex].unitPrice;
    } else {
      items.push(newItem);
    }
  }

  private calculateSubtotal(items: CartItem[]): number {
    return items.reduce((sum, item) => sum + item.totalPrice, 0);
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
