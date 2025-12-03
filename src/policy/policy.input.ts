import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class CreatePolicyInput {
  @Field()
  title: string;

  @Field()
  content: string;

  @Field()
  type: string;
}

@InputType()
export class UpdatePolicyInput {
  @Field({ nullable: true })
  title?: string;

  @Field({ nullable: true })
  content?: string;

  @Field({ nullable: true })
  type?: string;
}