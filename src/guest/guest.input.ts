import { InputType, Field } from '@nestjs/graphql';
import { IsNotEmpty, IsString, IsOptional } from 'class-validator';
import GraphQLJSON from 'graphql-type-json';

@InputType()
export class CreateGuestInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  ipAddress?: string;

  @Field(() => GraphQLJSON, { nullable: true })
  @IsOptional()
  deviceInfo?: any;
}

@InputType()
export class UpdateGuestInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  ipAddress?: string;

  @Field(() => GraphQLJSON, { nullable: true })
  @IsOptional()
  deviceInfo?: any;
}
