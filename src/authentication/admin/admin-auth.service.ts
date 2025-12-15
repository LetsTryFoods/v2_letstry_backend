import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AdminService } from '../../admin/admin.service';
import { Role } from '../../common/enums/role.enum';

@Injectable()
export class AdminAuthService {
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

  async validateJwtPayload(payload: any) {
    const admin = await this.adminService.findByEmail(payload.email);
    if (!admin) {
      return null;
    }
    const adminObj = admin.toObject();
    return { ...adminObj, role: Role.ADMIN };
  }

  async login(admin: any) {
    const payload = { email: admin.email, sub: admin._id, role: Role.ADMIN };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }
}
