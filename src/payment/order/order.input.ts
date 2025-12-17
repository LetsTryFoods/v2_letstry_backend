import { InputType, Field } from '@nestjs/graphql';
import { IsNotEmpty, IsString, IsOptional, IsNumber, Min, IsEnum } from 'class-validator';
import { OrderStatus } from './order.schema';
import { PaginationInput } from '../../common/pagination';

@InputType()
export class GetOrderByIdInput {
  @Field()
  @IsNotEmpty()
  @IsString()
  orderId: string;
}

@InputType()
export class GetMyOrdersInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number;

  @Field({ nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(1)
  limit?: number;

  @Field({ nullable: true })
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;
}

@InputType()
export class GetAllOrdersInput extends PaginationInput {
  @Field(() => OrderStatus, { nullable: true })
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @Field({ nullable: true })
  @IsOptional()
  startDate?: Date;

  @Field({ nullable: true })
  @IsOptional()
  endDate?: Date;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  userSearch?: string;
}

@InputType()
export class UpdateOrderStatusInput {
  @Field()
  @IsNotEmpty()
  @IsString()
  orderId: string;

  @Field(() => OrderStatus)
  @IsNotEmpty()
  @IsEnum(OrderStatus)
  status: OrderStatus;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  trackingNumber?: string;
}

@InputType()
export class CancelOrderInput {
  @Field()
  @IsNotEmpty()
  @IsString()
  orderId: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  reason?: string;
}
