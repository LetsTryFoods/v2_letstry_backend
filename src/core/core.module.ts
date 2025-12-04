import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { CacheModule } from '@nestjs/cache-manager';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import * as Joi from 'joi';
import KeyvRedis from '@keyv/redis';
import config from '../config/config';
import { LoggerModule } from '../logger/logger.module';
import { UploadModule } from '../upload/upload.module';
import { CaslModule } from '../casl/casl.module';
import { CommonModule } from '../common/common.module';

@Global()
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
    UploadModule,
    CaslModule,
    CommonModule,
  ],
  exports: [
    ConfigModule,
    MongooseModule,
    LoggerModule,
    CacheModule,
    GraphQLModule,
    UploadModule,
    CaslModule,
    CommonModule,
  ],
})
export class CoreModule {}
