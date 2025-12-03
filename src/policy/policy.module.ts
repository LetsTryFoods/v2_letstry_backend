import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PolicyService } from './policy.service';
import { PolicyResolver } from './policy.resolver';
import { Policy, PolicySchema } from './policy.schema';
import { AdminModule } from '../admin/admin.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Policy.name, schema: PolicySchema }]),
    AdminModule,
  ],
  providers: [PolicyService, PolicyResolver],
  exports: [PolicyService],
})
export class PolicyModule {}