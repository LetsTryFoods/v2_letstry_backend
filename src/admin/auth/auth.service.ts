import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AdminService } from '../admin.service';

@Injectable()
export class AuthService {
  constructor(
    private adminService: AdminService,
    private jwtService: JwtService,
  ) {}

  async validateAdmin(email: string, password: string): Promise<any> {
    const admin = await this.adminService.findByEmail(email);
    if (
      admin &&
      (await this.adminService.validatePassword(password, admin.password))
    ) {
      const { password: _, ...result } = admin.toObject();
      return result;
    }
    return null;
  }

  async login(admin: any) {
    const payload = { email: admin.email, sub: admin._id };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }
}
