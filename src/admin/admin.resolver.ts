import { Resolver, Mutation, Args, Context } from '@nestjs/graphql';
import { AuthService } from './auth/auth.service';
import { AdminService } from './admin.service';
import { UnauthorizedException } from '@nestjs/common';
import { Public } from './auth/public.decorator';

@Resolver()
export class AdminResolver {
  constructor(
    private authService: AuthService,
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
      sameSite: 'strict',
      maxAge: 60 * 60 * 1000,
    });
    return token.access_token;
  }

  @Mutation(() => String)
  @Public()
  async createAdmin(
    @Args('email') email: string,
    @Args('password') password: string,
  ): Promise<string> {
    try {
      const admin = await this.adminService.create({ email, password });
      return `Admin created with email: ${admin.email}`;
    } catch (error) {
      throw new UnauthorizedException('Failed to create admin');
    }
  }
}
