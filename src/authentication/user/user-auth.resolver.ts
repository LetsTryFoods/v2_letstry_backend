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
    const token = await this.userAuthService.verifyWhatsAppOtp(phoneNumber, otp, input, sessionId);
    
    if (context.res) {
      context.res.cookie('access_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
        domain: process.env.NODE_ENV === 'production' ? '.krsna.site' : undefined,
      });
    }
    
    return token;
  }

  @Mutation(() => String)
  @Public()
  async verifyOtpAndLogin(
    @Args('idToken') idToken: string,
    @Context() context: any,
    @Args('input', { nullable: true }) input?: CreateUserInput,
  ): Promise<string> {
    const sessionId = this.getSessionId(context);
    const token = await this.userAuthService.verifyOtpAndLogin(idToken, input, sessionId);
    
    if (context.res) {
      context.res.cookie('access_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
        domain: process.env.NODE_ENV === 'production' ? '.krsna.site' : undefined,
      });
    }
    
    return token;
  }

  @Mutation(() => String)
  @Public()
  async logout(@Context() context: any): Promise<string> {
    if (context.res) {
      context.res.cookie('access_token', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        maxAge: 0,
        domain: process.env.NODE_ENV === 'production' ? '.krsna.site' : undefined,
      });
    }
    
    return 'Logged out successfully';
  }
}