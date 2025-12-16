import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { ObjectType, Field, ID, registerEnumType } from '@nestjs/graphql';

export type PermissionDocument = Permission & Document;

// Enum for permission actions
export enum PermissionAction {
  VIEW = 'view',
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  MANAGE = 'manage', // Full access
}

registerEnumType(PermissionAction, {
  name: 'PermissionAction',
  description: 'The actions that can be performed on a resource',
});

@ObjectType()
@Schema({ timestamps: true })
export class Permission {
  @Field(() => ID)
  _id: string;

  @Field()
  @Prop({ required: true, unique: true })
  slug: string; // e.g., 'dashboard', 'products', 'orders', etc.

  @Field()
  @Prop({ required: true })
  name: string; // Display name e.g., 'Dashboard', 'Products Management'

  @Field({ nullable: true })
  @Prop()
  description?: string;

  @Field()
  @Prop({ required: true })
  module: string; // Group permissions by module e.g., 'core', 'catalog', 'orders'

  @Field()
  @Prop({ default: 0 })
  sortOrder: number;

  @Field()
  @Prop({ default: true })
  isActive: boolean;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}

export const PermissionSchema = SchemaFactory.createForClass(Permission);
