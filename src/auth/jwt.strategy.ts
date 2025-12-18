import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Role } from '../common/enums/role.enum';
import { AuthService as AdminAuthService } from '../admin/auth/auth.service';
import { UserAuthService } from '../user-auth/user-auth.service';
import { AdminUserService } from '../rbac/admin-user.service';

import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private adminAuthService: AdminAuthService,
    private userAuthService: UserAuthService,
    private adminUserService: AdminUserService,
    private configService: ConfigService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        (request: any) => {
          return request?.cookies?.access_token;
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') || 'defaultSecret',
    });
  }

  async validate(payload: any) {
    // Check if it's a new RBAC admin user (has roleSlug)
    if (payload.roleSlug) {
      // ✅ For JWT with embedded permissions, return directly without DB query (AWS-style)
      if (payload.permissions && Array.isArray(payload.permissions)) {
        return {
          _id: payload.sub,
          email: payload.email,
          role: payload.role,
          roleId: payload.roleId,
          roleSlug: payload.roleSlug,
          permissions: payload.permissions, // ✅ Permissions from JWT token - NO DB QUERY!
        };
      }
      // Fallback to DB query if no permissions in token (backward compatibility)
      return this.adminUserService.validateJwtPayload(payload);
    }
    
    // Fallback to old auth system
    switch (payload.role) {
      case Role.ADMIN:
        return this.adminAuthService.validateJwtPayload(payload);
      case Role.USER:
        return this.userAuthService.validateJwtPayload(payload);
      default:
        return null;
    }
  }
}
