import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Cart, CartDocument, CartStatus, CartItem } from './cart.schema';
import { ProductService } from '../product/product.service';
import { WinstonLoggerService } from '../logger/logger.service';
import { AddToCartInput, UpdateCartItemInput } from './cart.input';
import { CouponService } from '../coupon/coupon.service';
import { DiscountType } from '../coupon/coupon.schema';
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

  async getCart(
    userId?: string,
    sessionId?: string,
  ): Promise<CartDocument | null> {
    const filter = this.getCartFilter(userId, sessionId);
    if (!filter) return null;

    this.logger.log('Fetching cart', { userId, sessionId }, 'CartModule');
    return this.cartModel.findOne(filter).exec();
  }

  async addToCart(
    userId: string | undefined,
    sessionId: string | undefined,
    input: AddToCartInput,
  ): Promise<CartDocument> {
    this.validateUserIdentification(userId, sessionId);
    this.logger.log(
      'Adding to cart',
      { userId, sessionId, input },
      'CartModule',
    );

    const cart = await this.getOrCreateCart(userId, sessionId);
    const { product, variantId } = await this.validateProductAvailability(input.productId);
    const newItem = this.createCartItem(
      product,
      input.quantity,
      input.attributes,
      variantId,
    );

    this.upsertCartItem(cart.items, newItem);

    const savedCart = await this.saveAndRecalculateCart(cart);
    this.logger.log(
      'Item added to cart',
      { cartId: savedCart._id },
      'CartModule',
    );
    return savedCart;
  }

  async updateCartItem(
    userId: string | undefined,
    sessionId: string | undefined,
    input: UpdateCartItemInput,
  ): Promise<CartDocument> {
    this.logger.log(
      'Updating cart item',
      { userId, sessionId, input },
      'CartModule',
    );
    const cart = await this.getCartOrThrow(userId, sessionId);

    const itemIndex = this.findItemIndexInCart(cart.items, input.productId);
    if (itemIndex === -1) {
      throw new NotFoundException('Item not found in cart');
    }

    if (input.quantity === 0) {
      cart.items.splice(itemIndex, 1);
    } else {
      this.updateItemQuantity(cart.items[itemIndex], input.quantity);
    }

    return this.saveAndRecalculateCart(cart);
  }

  async mergeCarts(userId: string, sessionId: string): Promise<void> {
    this.logger.log('Merging carts', { userId, sessionId }, 'CartModule');

    const guestCart = await this.findActiveGuestCart(sessionId);

    if (!guestCart) {
      this.logger.log('No guest cart to merge', { sessionId }, 'CartModule');
      return;
    }

    if (guestCart.items.length === 0) {
      this.logger.log(
        'Guest cart is empty, marking as merged',
        { sessionId },
        'CartModule',
      );
      await this.markCartAsMerged(guestCart._id);
      return;
    }

    const userCart = await this.findActiveUserCart(userId);

    if (!userCart) {
      await this.adoptGuestCartAsUserCart(guestCart, userId, sessionId);
      return;
    }

    await this.mergeGuestItemsIntoUserCart(guestCart, userCart);
    await this.markCartAsMerged(guestCart._id);

    this.logger.log('Carts merged successfully', { userId }, 'CartModule');
  }

  async applyCoupon(
    userId: string | undefined,
    sessionId: string | undefined,
    code: string,
  ): Promise<CartDocument> {
    this.logger.log(
      'Applying coupon',
      { userId, sessionId, code },
      'CartModule',
    );
    const cart = await this.getCartOrThrow(userId, sessionId);

    await this.validateAndApplyCoupon(cart, code);
    return this.saveAndRecalculateCart(cart);
  }

  async removeCoupon(
    userId: string | undefined,
    sessionId: string | undefined,
  ): Promise<CartDocument> {
    this.logger.log('Removing coupon', { userId, sessionId }, 'CartModule');
    const cart = await this.getCartOrThrow(userId, sessionId);

    cart.couponCode = undefined;
    return this.saveAndRecalculateCart(cart);
  }

  async removeFromCart(
    userId: string | undefined,
    sessionId: string | undefined,
    productId: string,
  ): Promise<CartDocument> {
    this.logger.log(
      'Removing from cart',
      { userId, sessionId, productId },
      'CartModule',
    );
    const cart = await this.getCartOrThrow(userId, sessionId);

    cart.items = this.removeItemFromCart(cart.items, productId);
    return this.saveAndRecalculateCart(cart);
  }

  async clearCart(userId?: string, sessionId?: string): Promise<CartDocument> {
    this.logger.log('Clearing cart', { userId, sessionId }, 'CartModule');
    const cart = await this.getCartOrThrow(userId, sessionId);

    cart.items = [];
    return this.saveAndRecalculateCart(cart);
  }

  private async findActiveGuestCart(
    sessionId: string,
  ): Promise<CartDocument | null> {
    return this.cartModel.findOne({
      sessionId,
      status: CartStatus.ACTIVE,
    });
  }

  private async findActiveUserCart(
    userId: string,
  ): Promise<CartDocument | null> {
    return this.cartModel.findOne({
      userId,
      status: CartStatus.ACTIVE,
    });
  }

  private async markCartAsMerged(cartId: string): Promise<void> {
    await this.cartModel.findOneAndUpdate(
      { _id: cartId, status: CartStatus.ACTIVE },
      { status: CartStatus.MERGED },
      { new: true },
    );
  }

  private async adoptGuestCartAsUserCart(
    guestCart: CartDocument,
    userId: string,
    sessionId: string,
  ): Promise<void> {
    this.logger.log(
      'No existing user cart, adopting guest cart',
      { userId, sessionId },
      'CartModule',
    );

    const updated = await this.cartModel.findOneAndUpdate(
      { _id: guestCart._id, status: CartStatus.ACTIVE },
      {
        userId,
        sessionId: undefined,
        $unset: { sessionId: 1 },
      },
      { new: true },
    );

    if (!updated) {
      this.logger.warn(
        'Guest cart already merged by another process',
        { sessionId },
        'CartModule',
      );
    }
  }

  private async mergeGuestItemsIntoUserCart(
    guestCart: CartDocument,
    userCart: CartDocument,
  ): Promise<void> {
    this.logger.log(
      'Merging guest items into user cart',
      {
        guestCartId: guestCart._id,
        userCartId: userCart._id,
      },
      'CartModule',
    );

    for (const guestItem of guestCart.items) {
      this.upsertCartItem(userCart.items, guestItem);
    }

    await this.saveAndRecalculateCart(userCart);
  }

  private async validateAndApplyCoupon(
    cart: CartDocument,
    code: string,
  ): Promise<void> {
    try {
      await this.couponService.validateCoupon(
        code,
        cart.totalsSummary.subtotal,
      );
      cart.couponCode = code;
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  private async calculateDiscountAmount(
    cart: Cart,
    subtotal: number,
  ): Promise<number> {
    if (!cart.couponCode) {
      return 0;
    }

    try {
      return await this.calculateDiscount(
        subtotal,
        cart.items,
        cart.couponCode,
      );
    } catch (error) {
      this.logger.warn(
        `Coupon ${cart.couponCode} became invalid: ${error.message}`,
        'CartModule',
      );
      cart.couponCode = undefined;
      return 0;
    }
  }

  private async getHandlingCharge(): Promise<number> {
    const charges = await this.chargesService.getCharges();
    return charges?.active ? charges.handlingCharge : 0;
  }

  private calculateGrandTotal(
    subtotal: number,
    shippingCost: number,
    estimatedTax: number,
    handlingCharge: number,
    discountAmount: number,
  ): number {
    return Math.max(
      0,
      subtotal + shippingCost + estimatedTax + handlingCharge - discountAmount,
    );
  }

  private async recalculateCart(cart: Cart): Promise<void> {
    const subtotal = this.calculateSubtotal(cart.items);
    const discountAmount = await this.calculateDiscountAmount(cart, subtotal);
    const handlingCharge = await this.getHandlingCharge();

    const shippingCost = 0;
    const estimatedTax = 0;
    const grandTotal = this.calculateGrandTotal(
      subtotal,
      shippingCost,
      estimatedTax,
      handlingCharge,
      discountAmount,
    );

    cart.totalsSummary = {
      subtotal,
      discountAmount,
      shippingCost,
      estimatedTax,
      handlingCharge,
      grandTotal,
    };
  }

  private async getCartOrThrow(
    userId?: string,
    sessionId?: string,
  ): Promise<CartDocument> {
    this.validateUserIdentification(userId, sessionId);

    const cart = await this.getCart(userId, sessionId);
    if (!cart) {
      throw new NotFoundException('Cart not found');
    }
    return cart;
  }

  private findCartItemIndex(
    items: CartItem[],
    productId: string,
    attributes: any,
  ): number {
    return items.findIndex(
      (item) =>
        item.productId.toString() === productId &&
        JSON.stringify(item.attributes) === JSON.stringify(attributes),
    );
  }

  private upsertCartItem(items: CartItem[], newItem: CartItem) {
    const existingIndex = this.findCartItemIndex(
      items,
      newItem.productId,
      newItem.attributes,
    );
    if (existingIndex > -1) {
      items[existingIndex].quantity += newItem.quantity;
      items[existingIndex].totalPrice =
        items[existingIndex].quantity * items[existingIndex].unitPrice;
    } else {
      items.push(newItem);
    }
  }

  private getCartFilter(userId?: string, sessionId?: string) {
    if (userId) return { userId: userId, status: CartStatus.ACTIVE };
    if (sessionId) return { sessionId: sessionId, status: CartStatus.ACTIVE };
    return null;
  }

  private findItemIndexInCart(items: CartItem[], productId: string): number {
    return items.findIndex((item) => item.productId.toString() === productId);
  }

  private updateItemQuantity(item: CartItem, quantity: number): void {
    item.quantity = quantity;
    item.totalPrice = item.quantity * item.unitPrice;
  }

  private calculateSubtotal(items: CartItem[]): number {
    return items.reduce((sum, item) => sum + item.totalPrice, 0);
  }

  private removeItemFromCart(items: CartItem[], productId: string): CartItem[] {
    return items.filter((item) => item.productId.toString() !== productId);
  }

  private calculateApplicableAmount(
    coupon: any,
    subtotal: number,
    items: CartItem[],
  ): number {
    return subtotal;
  }

  private calculatePercentageDiscount(
    applicableAmount: number,
    discountValue: number,
    maxDiscountAmount?: number,
  ): number {
    let discountAmount = (applicableAmount * discountValue) / 100;
    if (maxDiscountAmount && discountAmount > maxDiscountAmount) {
      discountAmount = maxDiscountAmount;
    }
    return discountAmount;
  }

  private async calculateDiscount(
    subtotal: number,
    items: CartItem[],
    couponCode?: string,
  ): Promise<number> {
    if (!couponCode) return 0;

    const coupon = await this.couponService.validateCoupon(
      couponCode,
      subtotal,
    );
    const applicableAmount = this.calculateApplicableAmount(
      coupon,
      subtotal,
      items,
    );

    let discountAmount = 0;
    if (coupon.discountType === DiscountType.PERCENTAGE) {
      discountAmount = this.calculatePercentageDiscount(
        applicableAmount,
        coupon.discountValue,
        coupon.maxDiscountAmount,
      );
    } else if (coupon.discountType === DiscountType.FIXED) {
      discountAmount = coupon.discountValue;
    }

    return Math.min(discountAmount, subtotal);
  }

  private isProductValid(product: any): boolean {
    return (
      product &&
      !product.isArchived &&
      product.availabilityStatus === 'in_stock'
    );
  }

  private getInvalidProductReason(product: any): string {
    if (!product) return 'not_found';
    if (product.isArchived) return 'archived';
    return 'out_of_stock';
  }

  private updateCartItemPrice(item: CartItem, product: any): void {
    if (product.price !== item.unitPrice) {
      const oldPrice = item.unitPrice;
      item.unitPrice = product.price;
      item.totalPrice = product.price * item.quantity;

      this.logger.log(
        'Updated product price in cart',
        {
          productId: item.productId,
          oldPrice,
          newPrice: product.price,
        },
        'CartModule',
      );
    }
  }

  private validateUserIdentification(
    userId?: string,
    sessionId?: string,
  ): void {
    if (!userId && !sessionId) {
      this.logger.error(
        'Cannot perform cart operation without userId or sessionId',
        {},
        'CartModule',
      );
      throw new BadRequestException('User identification required');
    }
  }

  private async getOrCreateCart(
    userId?: string,
    sessionId?: string,
  ): Promise<CartDocument> {
    let cart = await this.getCart(userId, sessionId);

    if (!cart) {
      this.logger.log(
        'Cart not found, creating new one',
        { userId, sessionId },
        'CartModule',
      );
      cart = new this.cartModel({
        userId,
        sessionId,
        status: CartStatus.ACTIVE,
        items: [],
      });
    }

    return cart;
  }

  private async validateProductAvailability(productId: string) {
    const product = await this.findProduct(productId);

    this.validateProductStatus(product, productId);
    const variantId = await this.validateVariantAvailability(product, productId);

    return { product, variantId };
  }

  private async findProduct(productId: string) {
    try {
      return await this.productService.findOne(productId);
    } catch (error) {
      // If not found by product ID, try variant ID
      try {
        const product = await this.productService.findByVariantId(productId);
        this.logger.log('Found product by variant ID', { variantId: productId, productId: product._id }, 'CartModule');
        return product;
      } catch (variantError) {
        this.logger.error('Product not found (tried both product ID and variant ID)', { productId }, 'CartModule');
        throw new NotFoundException('Product not found');
      }
    }
  }

  private validateProductStatus(product: any, productId: string): void {
    if (product.isArchived) {
      this.logger.error('Product is archived', { productId }, 'CartModule');
      throw new BadRequestException('Product is not available for purchase');
    }
  }

  private async validateVariantAvailability(product: any, originalProductId: string): Promise<string> {
    const isVariantId = await this.isVariantId(originalProductId, product);

    if (isVariantId) {
      await this.validateSpecificVariant(product, originalProductId);
      return originalProductId;
    } else {
      const defaultVariant = this.getDefaultVariant(product);
      this.validateProductHasAvailableVariants(product, originalProductId);
      return defaultVariant._id.toString();
    }
  }

  private async isVariantId(productId: string, product: any): Promise<boolean> {
    return product.variants.some((variant: any) => variant._id.toString() === productId);
  }

  private async validateSpecificVariant(product: any, variantId: string): Promise<void> {
    const variant = product.variants.find((v: any) => v._id.toString() === variantId);
    if (!variant) {
      throw new NotFoundException('Product variant not found');
    }
    if (variant.availabilityStatus !== 'in_stock') {
      this.logger.error('Product variant is out of stock', { productId: product._id, variantId, status: variant.availabilityStatus }, 'CartModule');
      throw new BadRequestException('Product variant is currently out of stock');
    }
  }

  private validateProductHasAvailableVariants(product: any, productId: string): void {
    const hasAvailableVariant = product.variants.some((v: any) => v.availabilityStatus === 'in_stock' && v.isActive);
    if (!hasAvailableVariant) {
      this.logger.error('No available variants for product', { productId }, 'CartModule');
      throw new BadRequestException('Product is currently out of stock');
    }
  }

  private getDefaultVariant(product: any): any {
    const defaultVariant = product.variants.find((v: any) => v.isDefault && v.isActive && v.availabilityStatus === 'in_stock');
    if (defaultVariant) {
      return defaultVariant;
    }
    const firstAvailableVariant = product.variants.find((v: any) => v.isActive && v.availabilityStatus === 'in_stock');
    if (firstAvailableVariant) {
      return firstAvailableVariant;
    }
    throw new BadRequestException('No available variant found for product');
  }

  private createCartItem(
    product: any,
    quantity: number,
    attributes?: any,
    variantId?: string,
  ): CartItem {
    let variant;
    if (variantId) {
      variant = product.variants.find((v: any) => v._id.toString() === variantId);
    }
    if (!variant) {
      variant = this.getDefaultVariant(product);
    }

    return {
      productId: variantId || product._id,
      sku: variant.sku,
      name: `${product.name} - ${variant.name}`,
      quantity,
      unitPrice: variant.price,
      mrp: variant.mrp,
      totalPrice: variant.price * quantity,
      imageUrl: variant.images?.[0]?.url || product.variants?.[0]?.images?.[0]?.url,
      attributes,
    };
  }

  private async saveAndRecalculateCart(
    cart: CartDocument,
  ): Promise<CartDocument> {
    await this.recalculateCart(cart);
    return cart.save();
  }

  private async validateCartItem(
    item: CartItem,
  ): Promise<{ valid: boolean; product?: any }> {
    try {
      const product = await this.productService.findOne(item.productId);

      if (!this.isProductValid(product)) {
        this.logger.warn(
          'Removing invalid item from cart',
          {
            productId: item.productId,
            reason: this.getInvalidProductReason(product),
          },
          'CartModule',
        );
        return { valid: false };
      }

      return { valid: true, product };
    } catch (error) {
      this.logger.error(
        'Error validating cart item',
        {
          productId: item.productId,
          error: error.message,
        },
        'CartModule',
      );
      return { valid: false };
    }
  }

  async validateAndCleanCart(
    userId?: string,
    sessionId?: string,
  ): Promise<CartDocument | null> {
    const cart = await this.getCart(userId, sessionId);
    if (!cart || cart.items.length === 0) {
      return cart;
    }

    const validItems: CartItem[] = [];
    const removedItems: string[] = [];

    for (const item of cart.items) {
      const { valid, product } = await this.validateCartItem(item);

      if (!valid) {
        removedItems.push(item.name);
        continue;
      }

      this.updateCartItemPrice(item, product);
      validItems.push(item);
    }

    if (removedItems.length > 0) {
      cart.items = validItems;
      await this.saveAndRecalculateCart(cart);

      this.logger.log(
        'Cart cleaned',
        {
          removedCount: removedItems.length,
          removedItems,
        },
        'CartModule',
      );
    }

    return cart;
  }
}
