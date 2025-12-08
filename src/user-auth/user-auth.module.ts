import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { FirebaseModule } from '../firebase/firebase.module';
import { UserModule } from '../user/user.module';
import { UserAuthService } from './user-auth.service';
import { UserAuthResolver } from './user-auth.resolver';
import { IdentityModule } from '../identity/identity.module';
import { CartModule } from '../cart/cart.module';

@Module({
  imports: [
    FirebaseModule,
    UserModule,
    IdentityModule,
    CartModule,
  ],
  providers: [UserAuthService, UserAuthResolver],
  exports: [UserAuthService],
})
export class UserAuthModule {}