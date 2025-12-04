import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Role } from '../common/enums/role.enum';
import { AuthService as AdminAuthService } from '../admin/auth/auth.service';
import { UserAuthService } from '../user-auth/user-auth.service';

import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private adminAuthService: AdminAuthService,
    private userAuthService: UserAuthService,
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
