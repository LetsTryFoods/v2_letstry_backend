import { Injectable } from '@nestjs/common';
import { WinstonLoggerService } from './logger/logger.service';

@Injectable()
export class AppService {
  constructor(private logger: WinstonLoggerService) {}

  getHello(): string {
    this.logger.log('Hello method called');
    this.logger.debug?.('Debug info');
    this.logger.warn('Warning message');
    this.logger.error('Error message');
    return 'Hello World!';
  }
}
