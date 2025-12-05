import { InputType, Field, Int, ID } from '@nestjs/graphql';
import { IsNotEmpty, IsString, IsInt, Min, IsOptional, IsObject } from 'class-validator';
import GraphQLJSON from 'graphql-type-json';

@InputType()
export class AddToCartInput {
  @Field(() => ID)
  @IsNotEmpty()
  @IsString()
  productId: string;

  @Field(() => Int)
  @IsInt()
  @Min(1)
  quantity: number;

  @Field(() => GraphQLJSON, { nullable: true })
  @IsOptional()
  @IsObject()
  attributes?: any;
}

@InputType()
export class UpdateCartItemInput {
  @Field(() => ID)
  @IsNotEmpty()
  @IsString()
  productId: string;

  @Field(() => Int)
  @IsInt()
  @Min(0)
  quantity: number;
}
