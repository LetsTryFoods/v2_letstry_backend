import { HttpException, HttpStatus } from '@nestjs/common';

export interface IAppError {
  message: string;
  code: string;
  statusCode: number;
  details?: any;
}

export class AppException extends HttpException {
  constructor(error: IAppError) {
    super(
      {
        message: error.message,
        code: error.code,
        details: error.details,
      },
      error.statusCode,
    );
  }
}
