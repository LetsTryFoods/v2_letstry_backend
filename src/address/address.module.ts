import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Address, AddressSchema } from './address.schema';
import { AddressService } from './address.service';
import { AddressResolver } from './address.resolver';
import { GoogleMapsService } from './google-maps.service';
import { Identity, IdentitySchema } from '../common/schemas/identity.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Address.name, schema: AddressSchema },
      { name: Identity.name, schema: IdentitySchema },
    ]),
  ],
  providers: [AddressService, AddressResolver, GoogleMapsService],
  exports: [
    AddressService,
    MongooseModule.forFeature([{ name: Address.name, schema: AddressSchema }]),
  ],
})
export class AddressModule {}
