import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Role } from '../../common/enums/role.enum';
import { AdminAuthService } from '../admin/admin-auth.service';
import { UserAuthService } from '../user/user-auth.service';
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
        (request: any) => {
          return request?.cookies?.auth_token;
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') || 'defaultSecret',
    });
  }

  async validate(payload: any) {
    try {
      switch (payload.role) {
        case Role.ADMIN:
          return this.adminAuthService.validateJwtPayload(payload);
        case Role.USER:
          return this.userAuthService.validateJwtPayload(payload);
        default:
          return null;
      }
    } catch (error) {
      return null;
    }
  }
}
