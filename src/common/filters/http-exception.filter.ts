import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

export interface ErrorResponse {
  success: false;
  statusCode: number;
  message: string;
  error: string;
  errors?: Record<string, string[]> | string[];
  timestamp: string;
  path: string;
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let error = 'Internal Server Error';
    let errors: Record<string, string[]> | string[] | undefined;

    // Handle HttpException (includes all NestJS built-in exceptions)
    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
        error = exception.name;
      } else if (typeof exceptionResponse === 'object') {
        const responseObj = exceptionResponse as Record<string, any>;
        message = responseObj.message || exception.message;
        error = responseObj.error || exception.name;

        // Handle validation errors (class-validator)
        if (Array.isArray(responseObj.message)) {
          errors = responseObj.message;
          message = 'Validation failed';
        }
      }
    }
    // Handle TypeORM errors
    else if (this.isTypeORMError(exception)) {
      const typeormError = this.handleTypeORMError(exception);
      status = typeormError.status;
      message = typeormError.message;
      error = typeormError.error;
    }
    // Handle JWT errors
    else if (this.isJWTError(exception)) {
      status = HttpStatus.UNAUTHORIZED;
      message = 'Invalid or expired token';
      error = 'Unauthorized';
    }
    // Handle unknown errors
    else if (exception instanceof Error) {
      // Log the full error for debugging
      this.logger.error(
        `Unhandled error: ${exception.message}`,
        exception.stack,
      );
      // Don't expose internal error details in production
      message = process.env.NODE_ENV === 'development' 
        ? exception.message 
        : 'An unexpected error occurred';
    }

    // Log all errors
    this.logger.error(
      `${request.method} ${request.url} - ${status} - ${message}`,
      exception instanceof Error ? exception.stack : undefined,
    );

    const errorResponse: ErrorResponse = {
      success: false,
      statusCode: status,
      message,
      error,
      ...(errors && { errors }),
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    response.status(status).json(errorResponse);
  }

  private isTypeORMError(exception: unknown): boolean {
    if (!(exception instanceof Error)) return false;
    const typeormErrors = [
      'QueryFailedError',
      'EntityNotFoundError',
      'CannotCreateEntityIdMapError',
      'UpdateValuesMissingError',
    ];
    return typeormErrors.includes(exception.constructor.name);
  }

  private handleTypeORMError(exception: any): { status: number; message: string; error: string } {
    const errorName = exception.constructor.name;

    // Handle unique constraint violations
    if (exception.code === '23505' || exception.message?.includes('duplicate key')) {
      const match = exception.detail?.match(/Key \((\w+)\)=\((.+)\) already exists/);
      const field = match?.[1] || 'field';
      return {
        status: HttpStatus.CONFLICT,
        message: `${this.formatFieldName(field)} already exists`,
        error: 'Conflict',
      };
    }

    // Handle foreign key violations
    if (exception.code === '23503') {
      return {
        status: HttpStatus.BAD_REQUEST,
        message: 'Referenced record does not exist',
        error: 'Bad Request',
      };
    }

    // Handle not null violations
    if (exception.code === '23502') {
      const match = exception.message?.match(/column "(\w+)"/);
      const field = match?.[1] || 'field';
      return {
        status: HttpStatus.BAD_REQUEST,
        message: `${this.formatFieldName(field)} is required`,
        error: 'Bad Request',
      };
    }

    // Handle entity not found
    if (errorName === 'EntityNotFoundError') {
      return {
        status: HttpStatus.NOT_FOUND,
        message: 'Resource not found',
        error: 'Not Found',
      };
    }

    // Default database error
    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      message: process.env.NODE_ENV === 'development' 
        ? exception.message 
        : 'Database operation failed',
      error: 'Internal Server Error',
    };
  }

  private isJWTError(exception: unknown): boolean {
    if (!(exception instanceof Error)) return false;
    return [
      'JsonWebTokenError',
      'TokenExpiredError',
      'NotBeforeError',
    ].includes(exception.name);
  }

  private formatFieldName(field: string): string {
    // Convert snake_case to Title Case
    return field
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
}
