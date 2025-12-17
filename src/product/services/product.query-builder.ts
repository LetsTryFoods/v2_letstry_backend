import { ProductFilter } from './product.types';

export class ProductQueryBuilder {
  private filter: ProductFilter = {};

  withArchived(includeArchived: boolean): this {
    if (!includeArchived) {
      this.filter.isArchived = false;
    }
    return this;
  }

  withId(id: string): this {
    this.filter._id = id;
    return this;
  }

  withSlug(slug: string): this {
    this.filter.slug = slug;
    return this;
  }

  withCategoryId(categoryId: string): this {
    this.filter.categoryIds = categoryId;
    return this;
  }

  withVariantId(variantId: string): this {
    this.filter.variants = {
      $elemMatch: { _id: variantId },
    };
    return this;
  }

  withoutOutOfStock(includeOutOfStock: boolean): this {
    if (!includeOutOfStock) {
      this.filter.variants = {
        $elemMatch: {
          availabilityStatus: { $ne: 'out_of_stock' },
          isActive: true,
        },
      };
    }
    return this;
  }

  withSearch(searchTerm: string): this {
    const regex = new RegExp(searchTerm, 'i');
    this.filter.$or = [
      { name: regex },
      { description: regex },
      { brand: regex },
      { keywords: regex },
      { tags: regex },
    ];
    return this;
  }

  excludeId(id: string): this {
    this.filter._id = { $ne: id };
    return this;
  }

  build(): ProductFilter {
    if (
      this.filter.variants &&
      this.filter.isArchived === false &&
      !this.filter.$and
    ) {
      const variantsFilter = this.filter.variants;
      delete this.filter.variants;
      this.filter.$and = [{ isArchived: false }, { variants: variantsFilter }];
      delete this.filter.isArchived;
    }
    return this.filter;
  }

  static forId(id: string, includeArchived: boolean): ProductFilter {
    return new ProductQueryBuilder()
      .withId(id)
      .withArchived(includeArchived)
      .build();
  }

  static forSlug(slug: string, includeArchived: boolean): ProductFilter {
    return new ProductQueryBuilder()
      .withSlug(slug)
      .withArchived(includeArchived)
      .build();
  }

  static forCategory(
    categoryId: string,
    includeArchived: boolean,
  ): ProductFilter {
    return new ProductQueryBuilder()
      .withCategoryId(categoryId)
      .withArchived(includeArchived)
      .withoutOutOfStock(false)
      .build();
  }

  static forAll(
    includeOutOfStock: boolean,
    includeArchived: boolean,
  ): ProductFilter {
    return new ProductQueryBuilder()
      .withArchived(includeArchived)
      .withoutOutOfStock(includeOutOfStock)
      .build();
  }

  static forSearch(
    searchTerm: string,
    includeArchived: boolean,
  ): ProductFilter {
    return new ProductQueryBuilder()
      .withSearch(searchTerm)
      .withArchived(includeArchived)
      .withoutOutOfStock(false)
      .build();
  }

  static forVariantId(
    variantId: string,
    includeArchived: boolean,
  ): ProductFilter {
    return new ProductQueryBuilder()
      .withArchived(includeArchived)
      .withVariantId(variantId)
      .build();
  }

  static forSlugCheck(slug: string, excludeId?: string): ProductFilter {
    const builder = new ProductQueryBuilder().withSlug(slug);
    if (excludeId) {
      builder.excludeId(excludeId);
    }
    return builder.build();
  }
}
