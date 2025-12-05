import { InputType, Field } from '@nestjs/graphql';
import { IsNotEmpty, IsString, IsOptional } from 'class-validator';
import GraphQLJSON from 'graphql-type-json';

@InputType()
export class CreateGuestInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  ip_address?: string;

  @Field(() => GraphQLJSON, { nullable: true })
  @IsOptional()
  device_info?: any;
}
