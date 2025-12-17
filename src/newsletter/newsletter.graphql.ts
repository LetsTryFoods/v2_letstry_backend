import { ObjectType, Field } from '@nestjs/graphql';

@ObjectType()
export class SubscribeNewsletterResponse {
  @Field()
  success: boolean;

  @Field()
  message: string;

  @Field({ nullable: true })
  email?: string;
}
