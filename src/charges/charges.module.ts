import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ChargesService } from './charges.service';
import { ChargesResolver } from './charges.resolver';
import { Charges, ChargesSchema } from './charges.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Charges.name, schema: ChargesSchema }]),
  ],
  providers: [ChargesService, ChargesResolver],
  exports: [ChargesService],
})
export class ChargesModule {}
