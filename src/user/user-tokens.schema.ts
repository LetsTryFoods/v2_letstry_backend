import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ObjectType, Field, ID, GraphQLISODateTime } from '@nestjs/graphql';

export type UserTokensDocument = UserTokens & Document;

// Right now this scehma will be empty becuse our auth is manage by the firebase from client side so we have to store only the firebase uid and rest firebase manage but when we move to the third party we have manage the  token and refresh token by our self so this schema is for that time 
@Schema()
@ObjectType()
export class UserTokens {
  @Field(() => ID)
  _id: string;

  @Prop({ type: Types.ObjectId, required: true, unique: true, ref: 'User' })
  @Field()
  user_id: string;

  @Prop({ required: true })
  @Field()
  refresh_token_hash: string;

  @Prop({ required: true, type: Date })
  @Field(() => GraphQLISODateTime)
  expires_at: Date;

  @Prop()
  @Field({ nullable: true })
  issued_ip_address?: string;
}

export const UserTokensSchema = SchemaFactory.createForClass(UserTokens);