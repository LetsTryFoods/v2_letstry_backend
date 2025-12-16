import { Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as winston from 'winston';
import * as path from 'path';

@Injectable()
export class WinstonLoggerService implements LoggerService {
  private logger: winston.Logger;

  constructor(private configService: ConfigService) {
    const logConfig = this.configService.get('logger');

    this.logger = winston.createLogger({
      level: logConfig.level,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json(),
      ),
      transports: [
        new winston.transports.File({
          filename: path.resolve(logConfig.errorFile),
          level: 'error',
          format: winston.format.combine(
            winston.format((info) => {
              return info.level === 'error' ? info : false;
            })(),
            winston.format.timestamp(),
            winston.format.errors({ stack: true }),
            winston.format.json(),
          ),
        }),
        new winston.transports.File({
          filename: path.resolve(logConfig.debugFile),
          level: 'debug',
          format: winston.format.combine(
            winston.format((info) => {
              return info.level === 'debug' ? info : false;
            })(),
            winston.format.timestamp(),
            winston.format.errors({ stack: true }),
            winston.format.json(),
          ),
        }),
        new winston.transports.File({
          filename: path.resolve('logs/cart.log'),
          level: 'info',
          format: winston.format.combine(
            winston.format((info) => {
              return info.context === 'CartModule' ? info : false;
            })(),
            winston.format.timestamp(),
            winston.format.errors({ stack: true }),
            winston.format.json(),
          ),
        }),
        new winston.transports.File({
          filename: path.resolve('logs/guest.log'),
          level: 'info',
          format: winston.format.combine(
            winston.format((info) => {
              return info.context === 'GuestModule' ? info : false;
            })(),
            winston.format.timestamp(),
            winston.format.errors({ stack: true }),
            winston.format.json(),
          ),
        }),
        new winston.transports.File({
          filename: path.resolve(logConfig.guestConversionFile),
          level: 'info',
          format: winston.format.combine(
            winston.format((info) => {
              return info.context === 'GuestConversion' ? info : false;
            })(),
            winston.format.timestamp(),
            winston.format.errors({ stack: true }),
            winston.format.json(),
          ),
        }),
        new winston.transports.File({
          filename: path.resolve(logConfig.redisFile),
          level: 'info',
          format: winston.format.combine(
            winston.format((info) => {
              return info.context === 'Redis' ? info : false;
            })(),
            winston.format.timestamp(),
            winston.format.errors({ stack: true }),
            winston.format.json(),
          ),
        }),
        ...['product', 'category', 'banner', 'policy'].map(
          (module) =>
            new winston.transports.File({
              filename: path.resolve(`logs/redis-${module}.log`),
              level: 'info',
              format: winston.format.combine(
                winston.format((info) => {
                  const key =
                    info.key ||
                    (info.message &&
                      typeof info.message === 'object' &&
                      (info.message as any)['key']);

                  if (
                    info.context === 'Redis' &&
                    typeof key === 'string' &&
                    key.startsWith(`${module}:`)
                  ) {
                    return info;
                  }
                  return false;
                })(),
                winston.format.timestamp(),
                winston.format.errors({ stack: true }),
                winston.format.json(),
              ),
            }),
        ),
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.timestamp(),
            winston.format.printf(
              ({ timestamp, level, message, context, ...meta }) => {
                const ctx = context ? `[${context}] ` : '';
                const msg =
                  typeof message === 'object'
                    ? JSON.stringify(message, null, 2)
                    : message;
                const metaStr = Object.keys(meta).length
                  ? JSON.stringify(meta)
                  : '';
                return `${timestamp} ${level}: ${ctx}${msg} ${metaStr}`;
              },
            ),
          ),
        }),
      ],
    });

    this.logger.setMaxListeners(20);
  }

  log(message: any, ...optionalParams: any[]) {
    const context = optionalParams[optionalParams.length - 1];
    this.logger.info(message, { context });
  }

  error(message: any, ...optionalParams: any[]) {
    const context = optionalParams[optionalParams.length - 1];
    this.logger.error(message, { context });
  }

  warn(message: any, ...optionalParams: any[]) {
    const context = optionalParams[optionalParams.length - 1];
    this.logger.warn(message, { context });
  }

  debug?(message: any, ...optionalParams: any[]) {
    const context = optionalParams[optionalParams.length - 1];
    this.logger.debug(message, { context });
  }

  verbose?(message: any, ...optionalParams: any[]) {
    const context = optionalParams[optionalParams.length - 1];
    this.logger.verbose(message, { context });
  }

  fatal?(message: any, ...optionalParams: any[]) {
    const context = optionalParams[optionalParams.length - 1];
    this.logger.error(message, { context });
  }
}
