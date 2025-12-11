import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { WinstonLoggerService } from './logger/logger.service';
import { ConfigService } from '@nestjs/config';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  }); 
  app.useLogger(app.get(WinstonLoggerService));
  const configService = app.get(ConfigService);

  app.enableCors({
    origin: configService.get<string>('CORS_ORIGINS')?.split(',') || [
      'http://localhost:3000',
      'http://localhost:3001',
      'https://studio.apollographql.com',
    ],
    credentials: true,
  });

  app.useGlobalFilters(new GlobalExceptionFilter());
  app.use(cookieParser());

  console.log("Server get started")
  await app.listen(configService.get('PORT') ?? 3000);
}
bootstrap();
