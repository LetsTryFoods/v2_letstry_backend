import { Resolver, Mutation, Args, Context } from '@nestjs/graphql';
import { UserAuthService } from './user-auth.service';
import { CreateUserInput } from './user-auth.input';
import { Public } from '../../common/decorators/public.decorator';

@Resolver()
export class UserAuthResolver {
  constructor(private readonly userAuthService: UserAuthService) {}

  private getSessionId(context: any): string | undefined {
    const structuredCookie = context.req?.cookies?.guest_session;
    
    let sessionId: string | undefined;
    
    if (structuredCookie) {
      if (typeof structuredCookie === 'string') {
        try {
          const parsed = JSON.parse(structuredCookie);
          sessionId = parsed.sessionId;
        } catch (e) {
        }
      } else if (typeof structuredCookie === 'object' && structuredCookie.sessionId) {
        sessionId = structuredCookie.sessionId;
      }
    }
    
    if (!sessionId) {
      sessionId = context.req?.cookies?.sessionId;
    }
    
    return sessionId;
  }

  @Mutation(() => String)
  @Public()
  sendOtp(@Args('phoneNumber') phoneNumber: string): Promise<string> {
    return this.userAuthService.sendOtp(phoneNumber);
  }

  @Mutation(() => String)
  @Public()
  async verifyWhatsAppOtp(
    @Args('phoneNumber') phoneNumber: string,
    @Args('otp') otp: string,
    @Context() context: any,
    @Args('input', { nullable: true }) input?: CreateUserInput,
  ): Promise<string> {
    const sessionId = this.getSessionId(context);
    return this.userAuthService.verifyWhatsAppOtp(phoneNumber, otp, input, sessionId);
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