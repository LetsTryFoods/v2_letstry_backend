import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { WinstonLoggerService } from './logger/logger.service';
import { ConfigService } from '@nestjs/config';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import cookieParser from 'cookie-parser';

process.setMaxListeners(20);

async function bootstrap() {
  try {
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
        'https://front.krsna.site'
      ],
      credentials: true,
    });

    app.useGlobalFilters(new GlobalExceptionFilter());
    app.use(cookieParser());

    const port = configService.get('PORT') ?? 3000;
    await app.listen(port);
    console.log(`Server started successfully on port ${port}`);
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}
bootstrap();
