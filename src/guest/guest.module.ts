import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { GuestService } from './guest.service';
import { GuestResolver } from './guest.resolver';
import { Identity, IdentitySchema } from '../common/schemas/identity.schema';
import { LoggerModule } from '../logger/logger.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Identity.name, schema: IdentitySchema }]),
    LoggerModule,
  ],
  providers: [GuestService, GuestResolver],
  exports: [GuestService],
})
export class GuestModule {}
