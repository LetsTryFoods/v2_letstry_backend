import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { ObjectType, Field } from '@nestjs/graphql';

export type DashboardDocument = Dashboard & Document;

@ObjectType()
export class DashboardStats {
  @Field()
  totalProducts: number;

  @Field()
  archivedProducts: number;

  @Field()
  inStockProducts: number;

  @Field()
  outOfStockProducts: number;

  @Field()
  totalCategories: number;

  @Field()
  activeBanners: number;

  @Field()
  totalAdmins: number;

  @Field()
  totalUsers: number;
}

@Schema()
@ObjectType()
export class Dashboard {
  @Field(() => DashboardStats)
  stats: DashboardStats;
}

export const DashboardSchema = SchemaFactory.createForClass(Dashboard);
