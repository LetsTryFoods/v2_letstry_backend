import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import * as Joi from 'joi';
import { AppController } from './app.controller';
import { AppResolver } from './app.resolver';
import { AppService } from './app.service';
import config from './config/config';
import { LoggerModule } from './logger/logger.module';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { AdminModule } from './admin/admin.module';
import { UploadModule } from './upload/upload.module';
import { BannerModule } from './banner/banner.module';
import { CategoryModule } from './category/category.module';
import { ProductModule } from './product/product.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { PolicyModule } from './policy/policy.module';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './admin/auth/jwt-auth.guard';
import { CacheModule } from '@nestjs/cache-manager';
import KeyvRedis from '@keyv/redis';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: `.env.${process.env.NODE_ENV || 'development'}`,
      isGlobal: true,
      load: [config],
      validationSchema: Joi.object({
        NODE_ENV: Joi.string()
          .valid('development', 'production', 'test', 'provision')
          .default('development'),
        PORT: Joi.number().port().default(3000),
        DATABASE_URL: Joi.string().required(),
      }),
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const dbConfig = configService.get('database');
        return {
          uri: dbConfig.uri,
          ...dbConfig.options,
        };
      },
      inject: [ConfigService],
    }),
    LoggerModule,
    CacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const redisConfig = configService.get('redis');
        return {
          stores: [
            new KeyvRedis(`redis://${redisConfig.host}:${redisConfig.port}`),
          ],
        };
      },
      inject: [ConfigService],
    }),
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      playground: true,
      autoSchemaFile: 'schema.gql',
      graphiql: true,
      context: ({ req, res }) => ({ req, res }),
    }),
    AdminModule,
    UploadModule,
    BannerModule,
    CategoryModule,
    ProductModule,
    DashboardModule,
    PolicyModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    AppResolver,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
