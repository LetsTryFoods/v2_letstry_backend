import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { GqlArgumentsHost } from '@nestjs/graphql';
import { Request, Response } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const contextType = host.getType<string>();

    if (contextType === 'graphql') {
      return this.handleGraphQLException(exception, host);
    }

    return this.handleHttpException(exception, host);
  }

  private handleGraphQLException(exception: unknown, host: ArgumentsHost) {
    const gqlHost = GqlArgumentsHost.create(host);
    const info = gqlHost.getInfo();

    let message = 'Internal server error';

    if (exception instanceof HttpException) {
      const exceptionResponse = exception.getResponse() as any;
      
      if (typeof exceptionResponse === 'object') {
        message = exceptionResponse.message || exception.message;
      } else {
        message = exceptionResponse;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    this.logger.error(
      `GraphQL ${info?.fieldName || 'unknown'}`,
      exception instanceof Error ? exception.stack : null,
    );

    throw exception;
  }

  private handleHttpException(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();


    if (!request || !response) {
      this.logger.error(
        'Exception in non-HTTP context',
        exception instanceof Error ? exception.stack : String(exception),
      );
      throw exception;
    }

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let code = 'INTERNAL_SERVER_ERROR';
    let details = null;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse() as any;
      
      if (typeof exceptionResponse === 'object') {
        message = exceptionResponse.message || exception.message;
        code = exceptionResponse.code || 'HTTP_ERROR';
        details = exceptionResponse.details || null;
      } else {
        message = exceptionResponse;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    this.logger.error(
      `${request.method} ${request.url}`,
      exception instanceof Error ? exception.stack : null,
    );

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message,
      code,
      details,
    });
  }
}
