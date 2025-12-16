import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ObjectType, Field, ID } from '@nestjs/graphql';
import { AdminRole, AdminRolePopulated } from './admin-role.schema';

export type AdminUserDocument = AdminUser & Document;

@ObjectType()
@Schema({ timestamps: true })
export class AdminUser {
  @Field(() => ID)
  _id: string;

  @Field()
  @Prop({ required: true })
  name: string;

  @Field()
  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true })
  password: string; // Not exposed via GraphQL

  @Field({ nullable: true })
  @Prop()
  phone?: string;

  @Field({ nullable: true })
  @Prop()
  avatar?: string;

  @Field(() => ID)
  @Prop({ type: Types.ObjectId, ref: 'AdminRole', required: true })
  role: string | Types.ObjectId;

  @Field()
  @Prop({ default: true })
  isActive: boolean;

  @Field({ nullable: true })
  @Prop()
  lastLoginAt?: Date;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}

// Populated version for GraphQL responses
@ObjectType()
export class AdminUserPopulated {
  @Field(() => ID)
  _id: string;

  @Field()
  name: string;

  @Field()
  email: string;

  @Field({ nullable: true })
  phone?: string;

  @Field({ nullable: true })
  avatar?: string;

  @Field(() => AdminRolePopulated)
  role: AdminRolePopulated;

  @Field()
  isActive: boolean;

  @Field({ nullable: true })
  lastLoginAt?: Date;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}

// For login response - includes permissions for frontend
@ObjectType()
export class AdminUserWithPermissions {
  @Field(() => ID)
  _id: string;

  @Field()
  name: string;

  @Field()
  email: string;

  @Field({ nullable: true })
  phone?: string;

  @Field({ nullable: true })
  avatar?: string;

  @Field()
  roleName: string;

  @Field()
  roleSlug: string;

  @Field(() => [AdminPermissionDetail])
  permissions: AdminPermissionDetail[];

  @Field()
  isActive: boolean;

  @Field({ nullable: true })
  lastLoginAt?: Date;
}

// Permission detail for frontend navigation
@ObjectType()
export class AdminPermissionDetail {
  @Field()
  slug: string;

  @Field()
  name: string;

  @Field()
  module: string;

  @Field(() => [String])
  actions: string[];
}

export const AdminUserSchema = SchemaFactory.createForClass(AdminUser);
