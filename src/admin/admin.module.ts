import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PassportModule } from '@nestjs/passport';
import { AdminService } from './admin.service';
import { AdminResolver } from './admin.resolver';
import { AuthService } from './auth/auth.service';
import { LocalStrategy } from './auth/local.strategy';
import { Admin, AdminSchema } from './admin.schema';
import { UserModule } from '../user/user.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Admin.name, schema: AdminSchema }]),
    PassportModule,
    MongooseModule.forFeature([{ name: Admin.name, schema: AdminSchema }]),
    PassportModule,
    UserModule,
  ],
  providers: [
    AdminService,
    AdminResolver,
    AuthService,
    LocalStrategy,
  ],
  exports: [AdminService, AuthService],
})
export class AdminModule {}
