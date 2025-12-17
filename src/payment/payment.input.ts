import { InputType, Field } from '@nestjs/graphql';
import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsNumber,
  Min,
} from 'class-validator';

@InputType()
export class InitiatePaymentInput {
  @Field()
  @IsNotEmpty()
  @IsString()
  cartId: string;

  @Field()
  @IsNotEmpty()
  @IsString()
  amount: string;

  @Field()
  @IsNotEmpty()
  @IsString()
  currency: string;
}

@InputType()
export class ProcessRefundInput {
  @Field()
  @IsNotEmpty()
  @IsString()
  paymentOrderId: string;

  @Field()
  @IsNotEmpty()
  @IsString()
  refundAmount: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  reason?: string;
}

@InputType()
export class CheckPaymentStatusInput {
  @Field()
  @IsNotEmpty()
  @IsString()
  paymentOrderId: string;
}

@InputType()
export class BulkTransactionStatusInput {
  @Field()
  @IsNotEmpty()
  @IsString()
  fromDate: string;

  @Field()
  @IsNotEmpty()
  @IsString()
  toDate: string;

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
}

@InputType()
export class InitiateUpiQrPaymentInput {
  @Field()
  @IsNotEmpty()
  @IsString()
  cartId: string;

  @Field()
  @IsNotEmpty()
  @IsString()
  buyerEmail: string;

  @Field()
  @IsNotEmpty()
  @IsString()
  buyerName: string;

  @Field()
  @IsNotEmpty()
  @IsString()
  buyerPhone: string;
}
