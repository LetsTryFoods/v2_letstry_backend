import { Resolver, Mutation, Args, Context } from '@nestjs/graphql';
import { AdminAuthService } from '../authentication/admin/admin-auth.service';
import { AdminService } from './admin.service';
import { UnauthorizedException } from '@nestjs/common';
import { Public } from '../common/decorators/public.decorator';

@Resolver()
export class AdminResolver {
  constructor(
    private authService: AdminAuthService,
    private adminService: AdminService,
  ) {}

  @Mutation(() => String)
  @Public()
  async adminLogin(
    @Args('email') email: string,
    @Args('password') password: string,
    @Context() context,
  ): Promise<string> {
    const admin = await this.authService.validateAdmin(email, password);
    if (!admin) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const token = await this.authService.login(admin);
    context.res.cookie('access_token', token.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
      maxAge: 60 * 60 * 1000,
      domain: process.env.NODE_ENV === 'production' ? '.krsna.site' : undefined,
    });
    return token.access_token;
  }

  @Mutation(() => String)
  @Public()
  async createAdmin(
    @Args('email') email: string,
    @Args('password') password: string,
  ): Promise<string> {
    const admin = await this.adminService.create({ email, password });
    return `Admin created with email: ${admin.email}`;
  }

  @Mutation(() => String)
  @Public()
  async adminLogout(@Context() context): Promise<string> {
    if (context.res) {
      context.res.cookie('access_token', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
        maxAge: 0,
        domain: process.env.NODE_ENV === 'production' ? '.krsna.site' : undefined,
      });
    }
    return 'Admin logged out successfully';
  }
}
