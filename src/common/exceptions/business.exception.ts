import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Base class for business logic exceptions
 */
export class BusinessException extends HttpException {
  constructor(message: string, status: HttpStatus = HttpStatus.BAD_REQUEST) {
    super(
      {
        message,
        error: 'Business Error',
      },
      status,
    );
  }
}

/**
 * Thrown when a resource already exists
 */
export class ResourceExistsException extends HttpException {
  constructor(resource: string, identifier?: string) {
    const message = identifier
      ? `${resource} with ${identifier} already exists`
      : `${resource} already exists`;
    super(
      {
        message,
        error: 'Conflict',
      },
      HttpStatus.CONFLICT,
    );
  }
}

/**
 * Thrown when a resource is not found
 */
export class ResourceNotFoundException extends HttpException {
  constructor(resource: string, identifier?: string) {
    const message = identifier
      ? `${resource} with ID ${identifier} not found`
      : `${resource} not found`;
    super(
      {
        message,
        error: 'Not Found',
      },
      HttpStatus.NOT_FOUND,
    );
  }
}

/**
 * Thrown when user doesn't have permission
 */
export class InsufficientPermissionsException extends HttpException {
  constructor(action?: string) {
    const message = action
      ? `You do not have permission to ${action}`
      : 'You do not have permission to perform this action';
    super(
      {
        message,
        error: 'Forbidden',
      },
      HttpStatus.FORBIDDEN,
    );
  }
}

/**
 * Thrown when authentication fails
 */
export class AuthenticationFailedException extends HttpException {
  constructor(message: string = 'Authentication failed') {
    super(
      {
        message,
        error: 'Unauthorized',
      },
      HttpStatus.UNAUTHORIZED,
    );
  }
}

/**
 * Thrown when token is invalid or expired
 */
export class InvalidTokenException extends HttpException {
  constructor(tokenType: string = 'Token') {
    super(
      {
        message: `${tokenType} is invalid or expired`,
        error: 'Unauthorized',
      },
      HttpStatus.UNAUTHORIZED,
    );
  }
}

/**
 * Thrown when account is deactivated
 */
export class AccountDeactivatedException extends HttpException {
  constructor() {
    super(
      {
        message: 'Your account has been deactivated. Please contact support.',
        error: 'Forbidden',
      },
      HttpStatus.FORBIDDEN,
    );
  }
}

/**
 * Thrown for rate limiting
 */
export class TooManyRequestsException extends HttpException {
  constructor(retryAfter?: number) {
    super(
      {
        message: 'Too many requests. Please try again later.',
        error: 'Too Many Requests',
        ...(retryAfter && { retryAfter }),
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}

/**
 * Thrown when service is unavailable
 */
export class ServiceUnavailableException extends HttpException {
  constructor(service: string = 'Service') {
    super(
      {
        message: `${service} is temporarily unavailable. Please try again later.`,
        error: 'Service Unavailable',
      },
      HttpStatus.SERVICE_UNAVAILABLE,
    );
  }
}
