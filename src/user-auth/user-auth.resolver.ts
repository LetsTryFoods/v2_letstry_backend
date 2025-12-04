import { Resolver, Mutation, Args } from '@nestjs/graphql';
import { UserAuthService } from './user-auth.service';
import { CreateUserInput } from './user-auth.input';
import { Public } from '../common/decorators/public.decorator';

@Resolver()
export class UserAuthResolver {
  constructor(private readonly userAuthService: UserAuthService) {}

  @Mutation(() => String)
  @Public()
  sendOtp(@Args('phoneNumber') phoneNumber: string): Promise<string> {
    return this.userAuthService.sendOtp(phoneNumber);
  }

  @Mutation(() => String)
  @Public()
  async verifyOtpAndLogin(
    @Args('idToken') idToken: string,
    @Args('input', { nullable: true }) input?: CreateUserInput,
  ): Promise<string> {
    return this.userAuthService.verifyOtpAndLogin(idToken, input);
  }
}