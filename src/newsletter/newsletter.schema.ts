import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { ObjectType, Field, ID, GraphQLISODateTime } from '@nestjs/graphql';

export type NewsletterSubscriptionDocument = NewsletterSubscription & Document;

@Schema({ timestamps: true })
@ObjectType()
export class NewsletterSubscription {
  @Field(() => ID)
  _id: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  @Field()
  email: string;

  @Prop({ default: true })
  @Field()
  isActive: boolean;

  @Prop()
  @Field({ nullable: true })
  source?: string;

  @Prop()
  @Field({ nullable: true })
  ipAddress?: string;

  @Field(() => GraphQLISODateTime)
  createdAt: Date;

  @Field(() => GraphQLISODateTime)
  updatedAt: Date;
}

export const NewsletterSubscriptionSchema = SchemaFactory.createForClass(NewsletterSubscription);

NewsletterSubscriptionSchema.index({ email: 1 }, { unique: true });
NewsletterSubscriptionSchema.index({ isActive: 1 });
NewsletterSubscriptionSchema.index({ createdAt: -1 });
