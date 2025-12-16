import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { AdminService } from './admin.service';
import { AdminResolver } from './admin.resolver';
import { AdminAuthService } from '../authentication/admin/admin-auth.service';
import { AdminLocalStrategy } from '../authentication/admin/admin-local.strategy';
import { Admin, AdminSchema } from './admin.schema';
import { UserModule } from '../user/user.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Admin.name, schema: AdminSchema }]),
    PassportModule,
    UserModule,
  ],
  providers: [AdminService, AdminResolver],
  exports: [AdminService],
})
export class AdminModule {}
