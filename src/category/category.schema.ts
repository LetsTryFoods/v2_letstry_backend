import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type CategoryDocument = Category & Document;

@Schema({
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class Category {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true, unique: true })
  slug: string;

  @Prop()
  description: string;

  @Prop({ type: String, default: null })
  parentId: string | undefined;

  @Prop()
  imageUrl: string;

  @Prop({ required: true })
  codeValue: string;

  @Prop({ required: true })
  inCodeSet: string;

  @Prop({ default: 0 })
  productCount: number;

  @Prop({ default: false })
  isArchived: boolean;

  createdAt: Date;
  updatedAt: Date;
}

export const CategorySchema = SchemaFactory.createForClass(Category);

CategorySchema.virtual('id').get(function () {
  return this._id.toHexString();
});
