import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { GuestService } from './guest.service';
import { GuestResolver } from './guest.resolver';
import { Guest, GuestSchema } from './guest.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Guest.name, schema: GuestSchema }]),
  ],
  providers: [GuestService, GuestResolver],
  exports: [GuestService],
})
export class GuestModule {}
