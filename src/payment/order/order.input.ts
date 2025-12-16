import { InputType, Field } from '@nestjs/graphql';
import { IsNotEmpty, IsString, IsOptional, IsNumber, Min, IsEnum } from 'class-validator';
import { OrderStatus } from './order.schema';

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
