import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { WinstonLoggerService } from './logger/logger.service';
import { ConfigService } from '@nestjs/config';
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

<<<<<<< HEAD
  const configService = app.get(ConfigService);
  console.log("Server get started")
  await app.listen(configService.get('PORT') ?? 3000);
=======
  await app.listen(process.env.PORT ?? 3001);
>>>>>>> a08980e (update-env)
}
bootstrap();
