import { Module, Global } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtStrategy } from './common/jwt.strategy';
import { JwtAuthGuard } from './common/jwt-auth.guard';
import { DualAuthGuard } from './common/dual-auth.guard';
import { UserAuthGuard } from './common/user-auth.guard';
import { AdminModule } from '../admin/admin.module';
import { UserModule } from '../user/user.module';
import { FirebaseModule } from '../firebase/firebase.module';
import { UserAuthModule } from './user/user-auth.module';
import { AdminAuthService } from './admin/admin-auth.service';
import { AdminLocalStrategy } from './admin/admin-local.strategy';
import { Identity, IdentitySchema } from '../common/schemas/identity.schema';

@Global()
@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET') || 'defaultSecret',
        signOptions: { expiresIn: '60m' },
      }),
      inject: [ConfigService],
    }),
    MongooseModule.forFeature([{ name: Identity.name, schema: IdentitySchema }]),
    AdminModule,
    UserModule,
    FirebaseModule,
    UserAuthModule,
  ],
  providers: [JwtStrategy, JwtAuthGuard, DualAuthGuard, UserAuthGuard, AdminAuthService, AdminLocalStrategy],
  exports: [JwtAuthGuard, DualAuthGuard, UserAuthGuard, JwtModule, AdminAuthService],
})
export class AuthenticationModule {}
