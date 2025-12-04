import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class CreateUserInput {
  @Field()
  phoneNumber: string;

  @Field()
  firebaseUid: string;

  @Field()
  first_name: string;

  @Field()
  last_name: string;

  @Field({ nullable: true })
  email?: string;

  @Field({ nullable: true })
  marketing_sms_opt_in?: boolean;

  @Field({ nullable: true })
  signup_source?: string;

  @Field({ nullable: true })
  last_ip?: string;
}