import {
  Resolver,
  Query,
  Mutation,
  Args,
  ID,
  Int,
  ResolveField,
  Parent,
} from '@nestjs/graphql';
import { ProductService } from './product.service';
import { Product, ProductVariant, PriceRange } from './product.graphql';
import { ProductSeo } from './product-seo.schema';
import { CreateProductInput, UpdateProductInput, CreateProductVariantInput, UpdateProductVariantInput } from './product.input';
import { Public } from '../common/decorators/public.decorator';
import { Category } from '../category/category.graphql';
import { CategoryLoader } from '../category/category.loader';
import { CategoryService } from '../category/category.service';
import { PaginatedProducts, PaginationInput } from '../common/pagination';
import { Role } from '../common/enums/role.enum';
import { Roles } from '../common/decorators/roles.decorator';

@Resolver(() => Product)
export class ProductResolver {
  constructor(
    private readonly productService: ProductService,
    private readonly categoryLoader: CategoryLoader,
  ) {}

  @Query(() => PaginatedProducts, { name: 'products' })
  @Public()
  async getProducts(
    @Args('pagination', {
      type: () => PaginationInput,
      defaultValue: { page: 1, limit: 10 },
    })
    pagination: PaginationInput,
    @Args('includeOutOfStock', { type: () => Boolean, defaultValue: false })
    includeOutOfStock: boolean,
  ): Promise<PaginatedProducts> {
    const result = await this.productService.findAllPaginated(
      pagination.page,
      pagination.limit,
      includeOutOfStock,
    );
    return {
      items: result.items,
      meta: result.meta,
    };
  }

  @Query(() => Product, { name: 'product', nullable: true })
  @Public()
  async getProduct(
    @Args('id', { type: () => ID }) id: string,
  ): Promise<Product | null> {
    try {
      return await this.productService.findOne(id);
    } catch {
      return null;
    }
  }

  @Query(() => Product, { name: 'productBySlug', nullable: true })
  @Public()
  async getProductBySlug(@Args('slug') slug: string): Promise<Product | null> {
    try {
      return await this.productService.findBySlug(slug);
    } catch {
      return null;
    }
  }

  @Query(() => PaginatedProducts, { name: 'productsByCategory' })
  @Public()
  async getProductsByCategory(
    @Args('categoryId', { type: () => ID }) categoryId: string,
    @Args('pagination', {
      type: () => PaginationInput,
      defaultValue: { page: 1, limit: 10 },
    })
    pagination: PaginationInput,
  ): Promise<PaginatedProducts> {
    const result = await this.productService.findByCategoryIdPaginated(
      categoryId,
      pagination.page,
      pagination.limit,
    );
    return {
      items: result.items,
      meta: result.meta,
    };
  }

  @Query(() => PaginatedProducts, { name: 'searchProducts' })
  @Public()
  async searchProducts(
    @Args('searchTerm') searchTerm: string,
    @Args('pagination', {
      type: () => PaginationInput,
      defaultValue: { page: 1, limit: 10 },
    })
    pagination: PaginationInput,
  ): Promise<PaginatedProducts> {
    const result = await this.productService.searchProductsPaginated(
      searchTerm,
      pagination.page,
      pagination.limit,
    );
    return {
      items: result.items,
      meta: result.meta,
    };
  }

  @Mutation(() => Product, { name: 'createProduct' })
  @Roles(Role.ADMIN)
  async createProduct(
    @Args('input') input: CreateProductInput,
  ): Promise<Product> {
    return this.productService.create(input);
  }

  @Mutation(() => Product, { name: 'updateProduct' })
  @Roles(Role.ADMIN)
  async updateProduct(
    @Args('id', { type: () => ID }) id: string,
    @Args('input') input: UpdateProductInput,
  ): Promise<Product> {
    return this.productService.update(id, input);
  }

  @Mutation(() => Product, { name: 'deleteProduct' })
  @Roles(Role.ADMIN)
  async deleteProduct(
    @Args('id', { type: () => ID }) id: string,
  ): Promise<Product> {
    return this.productService.remove(id);
  }

  @Mutation(() => Product, { name: 'archiveProduct' })
  @Roles(Role.ADMIN)
  async archiveProduct(
    @Args('id', { type: () => ID }) id: string,
  ): Promise<Product> {
    return this.productService.archive(id);
  }

  @Mutation(() => Product, { name: 'unarchiveProduct' })
  @Roles(Role.ADMIN)
  async unarchiveProduct(
    @Args('id', { type: () => ID }) id: string,
  ): Promise<Product> {
    return this.productService.unarchive(id);
  }

  @Mutation(() => Product, { name: 'updateProductStock' })
  @Roles(Role.ADMIN)
  async updateProductStock(
    @Args('id', { type: () => ID }) id: string,
    @Args('quantity', { type: () => Int }) quantity: number,
  ): Promise<Product> {
    return this.productService.updateStock(id, quantity);
  }

  @Mutation(() => Product, { name: 'addProductVariant' })
  @Roles(Role.ADMIN)
  async addProductVariant(
    @Args('productId', { type: () => ID }) productId: string,
    @Args('input') input: CreateProductVariantInput,
  ): Promise<Product> {
    return this.productService.addVariant(productId, input);
  }

  @Mutation(() => Product, { name: 'updateProductVariant' })
  @Roles(Role.ADMIN)
  async updateProductVariant(
    @Args('productId', { type: () => ID }) productId: string,
    @Args('variantId', { type: () => ID }) variantId: string,
    @Args('input') input: UpdateProductVariantInput,
  ): Promise<Product> {
    return this.productService.updateVariant(productId, variantId, input);
  }

  @Mutation(() => Product, { name: 'removeProductVariant' })
  @Roles(Role.ADMIN)
  async removeProductVariant(
    @Args('productId', { type: () => ID }) productId: string,
    @Args('variantId', { type: () => ID }) variantId: string,
  ): Promise<Product> {
    return this.productService.removeVariant(productId, variantId);
  }

  @Mutation(() => Product, { name: 'setDefaultProductVariant' })
  @Roles(Role.ADMIN)
  async setDefaultProductVariant(
    @Args('productId', { type: () => ID }) productId: string,
    @Args('variantId', { type: () => ID }) variantId: string,
  ): Promise<Product> {
    return this.productService.setDefaultVariant(productId, variantId);
  }

  @Mutation(() => Product, { name: 'updateProductVariantStock' })
  @Roles(Role.ADMIN)
  async updateProductVariantStock(
    @Args('productId', { type: () => ID }) productId: string,
    @Args('variantId', { type: () => ID }) variantId: string,
    @Args('quantity', { type: () => Int }) quantity: number,
  ): Promise<Product> {
    return this.productService.updateVariantStock(productId, variantId, quantity);
  }

  @Query(() => ProductVariant, { name: 'productVariant', nullable: true })
  @Public()
  async getProductVariant(
    @Args('productId', { type: () => ID }) productId: string,
    @Args('variantId', { type: () => ID }) variantId: string,
  ): Promise<ProductVariant | null> {
    const product = await this.productService.findOne(productId);
    return product.variants.find(v => v._id === variantId) || null;
  }

  @ResolveField(() => [Category], { name: 'categories', nullable: true })
  async getCategories(@Parent() product: Product): Promise<Category[]> {
    if (!product.categoryIds || product.categoryIds.length === 0) return [];
    const categories = await Promise.all(
      product.categoryIds.map(id => this.categoryLoader.batchCategories.load(id))
    );
    return categories.filter(c => c !== null) as any[];
  }

  @ResolveField(() => ProductVariant, { name: 'defaultVariant', nullable: true })
  @Public()
  async getDefaultVariant(@Parent() product: Product): Promise<ProductVariant | null> {
    return product.variants.find(v => v.isDefault) || product.variants[0] || null;
  }

  @ResolveField(() => PriceRange, { name: 'priceRange' })
  @Public()
  async getPriceRange(@Parent() product: Product): Promise<PriceRange> {
    const prices = product.variants.map(v => v.price);
    return {
      min: Math.min(...prices),
      max: Math.max(...prices),
    };
  }

  @ResolveField(() => [ProductVariant], { name: 'availableVariants' })
  @Public()
  async getAvailableVariants(@Parent() product: Product): Promise<ProductVariant[]> {
    return product.variants.filter(v => v.isActive && v.stockQuantity > 0);
  }

  @ResolveField(() => ProductSeo, { name: 'seo', nullable: true })
  @Public()
  async getSeo(@Parent() product: Product): Promise<ProductSeo | null> {
    return this.productService.findSeoByProductId(product._id);
  }

}
