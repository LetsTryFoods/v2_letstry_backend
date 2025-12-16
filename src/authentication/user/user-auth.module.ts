import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { FirebaseModule } from '../../firebase/firebase.module';
import { UserModule } from '../../user/user.module';
import { UserAuthService } from './user-auth.service';
import { UserAuthResolver } from './user-auth.resolver';
import { IdentityModule } from '../../identity/identity.module';
import { CartModule } from '../../cart/cart.module';
import { WhatsAppModule } from '../../whatsapp/whatsapp.module';
import { AddressModule } from '../../address/address.module';
import { OtpService } from './otp.service';
import { Otp, OtpSchema } from './otp.schema';
import { Identity, IdentitySchema } from '../../common/schemas/identity.schema';
import { LoggerModule } from '../../logger/logger.module';

@Module({
  imports: [
    FirebaseModule,
    UserModule,
    IdentityModule,
    CartModule,
    WhatsAppModule,
    AddressModule,
    LoggerModule,
    MongooseModule.forFeature([
      { name: Otp.name, schema: OtpSchema },
      { name: Identity.name, schema: IdentitySchema }
    ]),
  ],
  providers: [UserAuthService, UserAuthResolver, OtpService],
  exports: [UserAuthService],
})
export class UserAuthModule {}