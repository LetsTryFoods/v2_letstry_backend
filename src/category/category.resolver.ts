import {
  Resolver,
  Query,
  Mutation,
  Args,
  ID,
  ResolveField,
  Parent,
} from '@nestjs/graphql';
import { CategoryService } from './category.service';
import { Category } from './category.graphql';
import { CreateCategoryInput, UpdateCategoryInput, AddProductsToCategoryInput, RemoveProductsFromCategoryInput } from './category.input';
import { Public } from '../common/decorators/public.decorator';
import { ProductService } from '../product/product.service';
import { Product } from '../product/product.graphql';
import { PaginatedCategories, PaginationInput } from '../common/pagination';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';

@Resolver(() => Category)
export class CategoryResolver {
  constructor(
    private readonly categoryService: CategoryService,
    private readonly productService: ProductService,
  ) {}

  @Query(() => PaginatedCategories, { name: 'categories' })
  @Public()
  async getCategories(
    @Args('pagination', {
      type: () => PaginationInput,
      defaultValue: { page: 1, limit: 10 },
    })
    pagination: PaginationInput,
    @Args('includeArchived', { type: () => Boolean, defaultValue: false })
    includeArchived: boolean,
  ): Promise<PaginatedCategories> {
    const result = await this.categoryService.findAllPaginated(
      pagination.page,
      pagination.limit,
      includeArchived,
    );
    return {
      items: result.items as any,
      meta: result.meta,
    };
  }

  @Query(() => PaginatedCategories, { name: 'rootCategories' })
  @Public()
  async getRootCategories(
    @Args('pagination', {
      type: () => PaginationInput,
      defaultValue: { page: 1, limit: 10 },
    })
    pagination: PaginationInput,
    @Args('includeArchived', { type: () => Boolean, defaultValue: false })
    includeArchived: boolean,
  ): Promise<PaginatedCategories> {
    const result = await this.categoryService.findRootCategoriesPaginated(
      pagination.page,
      pagination.limit,
      includeArchived,
    );
    return {
      items: result.items as any,
      meta: result.meta,
    };
  }

  @Query(() => PaginatedCategories, { name: 'categoryChildren' })
  @Public()
  async getCategoryChildren(
    @Args('parentId', { type: () => ID }) parentId: string,
    @Args('pagination', {
      type: () => PaginationInput,
      defaultValue: { page: 1, limit: 10 },
    })
    pagination: PaginationInput,
    @Args('includeArchived', { type: () => Boolean, defaultValue: false })
    includeArchived: boolean,
  ): Promise<PaginatedCategories> {
    const result = await this.categoryService.findChildrenPaginated(
      parentId,
      pagination.page,
      pagination.limit,
      includeArchived,
    );
    return {
      items: result.items as any,
      meta: result.meta,
    };
  }

  @Query(() => Category, { name: 'category', nullable: true })
  @Public()
  async getCategory(
    @Args('id', { type: () => ID }) id: string,
    @Args('includeArchived', { type: () => Boolean, defaultValue: false })
    includeArchived: boolean,
  ): Promise<Category | null> {
    try {
      return (await this.categoryService.findOne(id, includeArchived)) as any;
    } catch {
      return null;
    }
  }

  @Query(() => Category, { name: 'categoryBySlug', nullable: true })
  @Public()
  async getCategoryBySlug(
    @Args('slug') slug: string,
    @Args('includeArchived', { type: () => Boolean, defaultValue: false })
    includeArchived: boolean,
  ): Promise<Category | null> {
    try {
      return (await this.categoryService.findBySlug(
        slug,
        includeArchived,
      )) as any;
    } catch {
      return null;
    }
  }

  @Mutation(() => Category, { name: 'createCategory' })
  @Roles(Role.ADMIN)
  async createCategory(
    @Args('input') input: CreateCategoryInput,
  ): Promise<Category> {
    return this.categoryService.create(input) as any;
  }

  @Mutation(() => Category, { name: 'updateCategory' })
  @Roles(Role.ADMIN)
  async updateCategory(
    @Args('id', { type: () => ID }) id: string,
    @Args('input') input: UpdateCategoryInput,
  ): Promise<Category> {
    return this.categoryService.update(id, input) as any;
  }

  @Mutation(() => Category, { name: 'archiveCategory' })
  @Roles(Role.ADMIN)
  async archiveCategory(
    @Args('id', { type: () => ID }) id: string,
  ): Promise<Category> {
    return this.categoryService.archive(id) as any;
  }

  @Mutation(() => Category, { name: 'unarchiveCategory' })
  @Roles(Role.ADMIN)
  async unarchiveCategory(
    @Args('id', { type: () => ID }) id: string,
  ): Promise<Category> {
    return this.categoryService.unarchive(id) as any;
  }

  @Mutation(() => Boolean, { name: 'addProductsToCategory' })
  @Roles(Role.ADMIN)
  async addProductsToCategory(
    @Args('input') input: AddProductsToCategoryInput,
  ): Promise<boolean> {
    return this.categoryService.addProductsToCategory(input.categoryId, input.productIds);
  }

  @Mutation(() => Boolean, { name: 'removeProductsFromCategory' })
  @Roles(Role.ADMIN)
  async removeProductsFromCategory(
    @Args('input') input: RemoveProductsFromCategoryInput,
  ): Promise<boolean> {
    return this.categoryService.removeProductsFromCategory(input.categoryId, input.productIds);
  }

  @ResolveField(() => [Product], { name: 'products' })
  @Roles(Role.ADMIN)
  async getProducts(@Parent() category: Category): Promise<Product[]> {
    return this.productService.findByCategoryId(category.id);
  }

  @ResolveField(() => Number, { name: 'productCount' })
  @Public()
  async getProductCount(@Parent() category: Category): Promise<number> {
    return this.productService.countByCategoryId(category.id);
  }
}
