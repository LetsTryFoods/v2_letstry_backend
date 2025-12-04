import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { WinstonLoggerService } from './logger/logger.service';
import { ConfigService } from '@nestjs/config';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  }); 
  app.useLogger(app.get(WinstonLoggerService));
  app.enableCors({
    origin:
      process.env.NODE_ENV === 'production'
        ? ['https://your-frontend-domain.com']
        : [
            'http://localhost:3000',
            'http://localhost:3001',
            'https://studio.apollographql.com',
          ],
    credentials: true,
  });

  app.useGlobalFilters(new GlobalExceptionFilter());

  const configService = app.get(ConfigService);
  console.log("Server get started")
  await app.listen(configService.get('PORT') ?? 3000);
}
bootstrap();
