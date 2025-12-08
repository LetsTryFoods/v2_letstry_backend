import { Resolver, Mutation, Args, Context } from '@nestjs/graphql';
import { UserAuthService } from './user-auth.service';
import { CreateUserInput } from './user-auth.input';
import { Public } from '../common/decorators/public.decorator';

@Resolver()
export class UserAuthResolver {
  constructor(private readonly userAuthService: UserAuthService) {}

  private getSessionId(context: any): string | undefined {
    const cookie = context.req?.cookies?.guest_session;
    return cookie?.sessionId;
  }

  @Mutation(() => String)
  @Public()
  sendOtp(@Args('phoneNumber') phoneNumber: string): Promise<string> {
    return this.userAuthService.sendOtp(phoneNumber);
  }

  @Mutation(() => String)
  @Public()
  async verifyOtpAndLogin(
    @Args('idToken') idToken: string,
    @Context() context: any,
    @Args('input', { nullable: true }) input?: CreateUserInput,
  ): Promise<string> {
    const sessionId = this.getSessionId(context);
    return this.userAuthService.verifyOtpAndLogin(idToken, input, sessionId);
  }
}