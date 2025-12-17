import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { ObjectType, Field, ID, GraphQLISODateTime } from '@nestjs/graphql';

export type FooterDetailDocument = FooterDetail & Document;

// Social Media Link Schema
@Schema()
@ObjectType()
export class SocialMediaLink {
  @Prop({ required: true })
  @Field()
  platform: string;

  @Prop({ required: true })
  @Field()
  url: string;

  @Prop()
  @Field({ nullable: true })
  iconUrl?: string;
}

export const SocialMediaLinkSchema = SchemaFactory.createForClass(SocialMediaLink);

// Quick Link Schema (for links like Search, Refund & Cancellations, etc.)
@Schema()
@ObjectType()
export class QuickLink {
  @Prop({ required: true })
  @Field()
  label: string;

  @Prop({ required: true })
  @Field()
  url: string;

  @Prop({ default: 0 })
  @Field()
  order: number;

  @Prop({ default: true })
  @Field()
  isActive: boolean;
}

export const QuickLinkSchema = SchemaFactory.createForClass(QuickLink);

@Schema({ timestamps: true })
@ObjectType()
export class FooterDetail {
  @Field(() => ID)
  _id: string;

  // === STYLING ===
  @Prop({ default: '#1e293b' })
  @Field({ nullable: true })
  backgroundColor?: string;

  @Prop({ default: '#ffffff' })
  @Field({ nullable: true })
  textColor?: string;

  @Prop({ default: '#60a5fa' })
  @Field({ nullable: true })
  linkColor?: string;

  @Prop({ default: '#93c5fd' })
  @Field({ nullable: true })
  linkHoverColor?: string;

  // === LOGO SECTION ===
  @Prop()
  @Field({ nullable: true })
  logoUrl?: string;

  // === SOCIAL MEDIA SECTION ===
  @Prop({ default: 'Follow us' })
  @Field({ nullable: true })
  socialMediaTitle?: string;

  @Prop({ type: [SocialMediaLinkSchema], default: [] })
  @Field(() => [SocialMediaLink], { nullable: true })
  socialMediaLinks?: SocialMediaLink[];

  // === QUICK LINKS SECTION ===
  @Prop({ default: 'QUICK LINKS' })
  @Field({ nullable: true })
  quickLinksTitle?: string;

  @Prop({ type: [QuickLinkSchema], default: [] })
  @Field(() => [QuickLink], { nullable: true })
  quickLinks?: QuickLink[];

  // === CONTACT US SECTION ===
  @Prop({ default: 'CONTACT US' })
  @Field({ nullable: true })
  contactTitle?: string;

  @Prop({ required: true })
  @Field()
  companyName: string;

  @Prop()
  @Field({ nullable: true })
  cin?: string;

  @Prop({ required: true })
  @Field()
  address: string;

  @Prop({ required: true })
  @Field()
  email: string;

  @Prop({ required: true })
  @Field()
  phone: string;

  @Prop()
  @Field({ nullable: true })
  exportEmailLabel?: string;

  @Prop()
  @Field({ nullable: true })
  exportEmail?: string;

  // === COPYRIGHT SECTION ===
  @Prop()
  @Field({ nullable: true })
  copyrightText?: string;

  // === STATUS ===
  @Prop({ default: true })
  @Field()
  isActive: boolean;

  @Field(() => GraphQLISODateTime)
  createdAt: Date;

  @Field(() => GraphQLISODateTime)
  updatedAt: Date;
}

export const FooterDetailSchema = SchemaFactory.createForClass(FooterDetail);

FooterDetailSchema.virtual('id').get(function (this: any) {
  return this._id?.toString();
});

FooterDetailSchema.set('toJSON', {
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

FooterDetailSchema.index({ isActive: 1 });

FooterDetailSchema.virtual('id').get(function (this: any) {
  return this._id?.toString();
});

FooterDetailSchema.set('toJSON', {
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

FooterDetailSchema.index({ isActive: 1 });
