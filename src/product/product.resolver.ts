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
import { Product } from './product.graphql';
import { CreateProductInput, UpdateProductInput } from './product.input';
import { Public } from '../admin/auth/public.decorator';
import { Category } from '../category/category.graphql';
import { CategoryService } from '../category/category.service';
import { PaginatedProducts, PaginationInput } from '../common/pagination';

@Resolver(() => Product)
export class ProductResolver {
  constructor(
    private readonly productService: ProductService,
    private readonly categoryService: CategoryService,
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
  async createProduct(
    @Args('input') input: CreateProductInput,
  ): Promise<Product> {
    return this.productService.create(input);
  }

  @Mutation(() => Product, { name: 'updateProduct' })
  async updateProduct(
    @Args('id', { type: () => ID }) id: string,
    @Args('input') input: UpdateProductInput,
  ): Promise<Product> {
    return this.productService.update(id, input);
  }

  @Mutation(() => Product, { name: 'deleteProduct' })
  async deleteProduct(
    @Args('id', { type: () => ID }) id: string,
  ): Promise<Product> {
    return this.productService.remove(id);
  }

  @Mutation(() => Product, { name: 'archiveProduct' })
  async archiveProduct(
    @Args('id', { type: () => ID }) id: string,
  ): Promise<Product> {
    return this.productService.archive(id);
  }

  @Mutation(() => Product, { name: 'unarchiveProduct' })
  async unarchiveProduct(
    @Args('id', { type: () => ID }) id: string,
  ): Promise<Product> {
    return this.productService.unarchive(id);
  }

  @Mutation(() => Product, { name: 'updateProductStock' })
  async updateProductStock(
    @Args('id', { type: () => ID }) id: string,
    @Args('quantity', { type: () => Int }) quantity: number,
  ): Promise<Product> {
    return this.productService.updateStock(id, quantity);
  }

  @ResolveField(() => Category, { name: 'category', nullable: true })
  async getCategory(@Parent() product: Product): Promise<Category | null> {
    if (!product.categoryId) return null;
    return this.categoryService.findOne(product.categoryId, true) as any;
  }
}
