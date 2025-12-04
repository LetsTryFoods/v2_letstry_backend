import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from './user.schema';
import { UserService } from './user.service';
import { FirebaseAuth, FirebaseAuthSchema } from './firebase-auth.schema';
import { FirebaseAuthService } from './firebase-auth.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: FirebaseAuth.name, schema: FirebaseAuthSchema },
    ]),
  ],
  providers: [UserService, FirebaseAuthService],
  exports: [UserService, FirebaseAuthService],
})
export class UserModule {}
