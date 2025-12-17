import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Identity, IdentitySchema } from '../common/schemas/identity.schema';
import { UserService } from './user.service';
import { UserResolver } from './user.resolver';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Identity.name, schema: IdentitySchema },
    ]),
  ],
  providers: [UserService, UserResolver],
  exports: [UserService],
})
export class UserModule {}
