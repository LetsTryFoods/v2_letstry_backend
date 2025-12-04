import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FirebaseAuth, FirebaseAuthSchema } from './firebase-auth.schema';
import { FirebaseAuthService } from './firebase-auth.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: FirebaseAuth.name, schema: FirebaseAuthSchema },
    ]),
  ],
  providers: [FirebaseAuthService],
  exports: [FirebaseAuthService],
})
export class IdentityModule {}
