import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  ManufacturingAddress,
  ManufacturingAddressSchema,
} from './manufacturing-address.schema';
import { ManufacturingAddressService } from './manufacturing-address.service';
import { ManufacturingAddressResolver } from './manufacturing-address.resolver';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ManufacturingAddress.name, schema: ManufacturingAddressSchema },
    ]),
  ],
  providers: [ManufacturingAddressService, ManufacturingAddressResolver],
  exports: [ManufacturingAddressService],
})
export class ManufacturingAddressModule {}
