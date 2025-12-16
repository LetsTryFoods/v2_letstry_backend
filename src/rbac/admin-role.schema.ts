import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ObjectType, Field, ID } from '@nestjs/graphql';
import { Permission, PermissionAction } from './permission.schema';

export type AdminRoleDocument = AdminRole & Document;

// Nested type for role-permission with actions
@ObjectType()
export class RolePermission {
  @Field(() => ID)
  permission: string; // Reference to Permission._id

  @Field(() => [String])
  actions: PermissionAction[]; // Allowed actions for this permission
}

@ObjectType()
@Schema({ timestamps: true })
export class AdminRole {
  @Field(() => ID)
  _id: string;

  @Field()
  @Prop({ required: true, unique: true })
  name: string; // e.g., 'Super Admin', 'Manager', 'Viewer'

  @Field()
  @Prop({ required: true, unique: true })
  slug: string; // e.g., 'super-admin', 'manager', 'viewer'

  @Field({ nullable: true })
  @Prop()
  description?: string;

  @Field(() => [RolePermissionType])
  @Prop({
    type: [
      {
        permission: { type: Types.ObjectId, ref: 'Permission' },
        actions: [{ type: String, enum: Object.values(PermissionAction) }],
      },
    ],
    default: [],
  })
  permissions: RolePermissionType[];

  @Field()
  @Prop({ default: false })
  isSystem: boolean; // System roles cannot be deleted (e.g., Super Admin)

  @Field()
  @Prop({ default: true })
  isActive: boolean;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}

// GraphQL type for role permission
@ObjectType()
export class RolePermissionType {
  @Field(() => ID)
  permission: string | Types.ObjectId;

  @Field(() => [String])
  actions: string[];
}

// Populated version for GraphQL responses
@ObjectType()
export class RolePermissionPopulated {
  @Field(() => Permission)
  permission: Permission;

  @Field(() => [String])
  actions: string[];
}

@ObjectType()
export class AdminRolePopulated {
  @Field(() => ID)
  _id: string;

  @Field()
  name: string;

  @Field()
  slug: string;

  @Field({ nullable: true })
  description?: string;

  @Field(() => [RolePermissionPopulated])
  permissions: RolePermissionPopulated[];

  @Field()
  isSystem: boolean;

  @Field()
  isActive: boolean;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}

export const AdminRoleSchema = SchemaFactory.createForClass(AdminRole);
