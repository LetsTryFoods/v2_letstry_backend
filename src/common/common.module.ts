import { Module, Global } from '@nestjs/common';
import { SlugService } from './services/slug.service';

@Global()
@Module({
  providers: [SlugService],
  exports: [SlugService],
})
export class CommonModule {}
