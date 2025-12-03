import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { UploadService } from './upload.service';
import { UploadController } from './upload.controller';

@Module({
  imports: [ConfigModule],
  providers: [UploadService],
  controllers: [UploadController],
})
export class UploadModule {}
