import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { ObjectType, Field, ID, GraphQLISODateTime } from '@nestjs/graphql';

export type BannerDocument = Banner & Document;

@Schema({ timestamps: true })
@ObjectType()
export class Banner {
  @Field(() => ID)
  _id: string;

  @Prop({ required: true })
  @Field()
  name: string;

  @Prop({ required: true })
  @Field()
  headline: string;

  @Prop({ required: true })
  @Field()
  subheadline: string;

  @Prop()
  @Field({ nullable: true })
  description?: string;

  @Prop({ required: true })
  @Field()
  imageUrl: string;

  @Prop({ required: true })
  @Field()
  mobileImageUrl: string;

  @Prop()
  @Field({ nullable: true })
  thumbnailUrl?: string;

  @Prop({ required: true })
  @Field()
  url: string;

  @Prop({ required: true })
  @Field()
  ctaText: string;

  @Prop({ required: true, type: Number })
  @Field(() => Number)
  position: number;

  @Prop({ default: true })
  @Field()
  isActive: boolean;

  @Prop()
  @Field(() => GraphQLISODateTime, { nullable: true })
  startDate?: Date;

  @Prop()
  @Field(() => GraphQLISODateTime, { nullable: true })
  endDate?: Date;

  @Prop()
  @Field({ nullable: true })
  backgroundColor?: string;

  @Prop()
  @Field({ nullable: true })
  textColor?: string;

  @Field(() => GraphQLISODateTime)
  createdAt: Date;

  @Field(() => GraphQLISODateTime)
  updatedAt: Date;
}

export const BannerSchema = SchemaFactory.createForClass(Banner);

BannerSchema.virtual('id').get(function (this: any) {
  return this._id?.toString();
});

BannerSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: function (_: any, ret: any) {
    if (ret._id) {
      ret.id = ret._id.toString();
      delete ret._id;
    }
    delete ret.__v;
  },
});

BannerSchema.index({ position: 1 });
