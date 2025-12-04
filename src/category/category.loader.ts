import { Injectable, Scope } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Category, CategoryDocument } from './category.schema';
import DataLoader from 'dataloader';

@Injectable({ scope: Scope.REQUEST })
export class CategoryLoader {
  constructor(
    @InjectModel(Category.name) private readonly categoryModel: Model<CategoryDocument>,
  ) {}

  public readonly batchCategories = new DataLoader(async (categoryIds: string[]) => {
    const categories = await this.categoryModel.find({
      _id: { $in: categoryIds },
    });
    const categoryMap = new Map(categories.map((c) => [c._id.toString(), c]));
    return categoryIds.map((id) => categoryMap.get(id.toString()) || null);
  });
}
