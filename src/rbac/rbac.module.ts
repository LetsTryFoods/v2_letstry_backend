import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Permission, PermissionSchema } from './permission.schema';
import { AdminRole, AdminRoleSchema } from './admin-role.schema';
import { AdminUser, AdminUserSchema } from './admin-user.schema';
import { PermissionService } from './permission.service';
import { AdminRoleService } from './admin-role.service';
import { AdminUserService } from './admin-user.service';
import { RbacResolver } from './rbac.resolver';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Permission.name, schema: PermissionSchema },
      { name: AdminRole.name, schema: AdminRoleSchema },
      { name: AdminUser.name, schema: AdminUserSchema },
    ]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET') || 'defaultSecret',
        signOptions: { expiresIn: '1h' },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [
    PermissionService,
    AdminRoleService,
    AdminUserService,
    RbacResolver,
  ],
  exports: [
    PermissionService,
    AdminRoleService,
    AdminUserService,
  ],
})
export class RbacModule {}
