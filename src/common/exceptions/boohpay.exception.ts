import { HttpException, HttpStatus } from '@nestjs/common';

export class BoohPayException extends HttpException {
  constructor(message: string, statusCode: HttpStatus = HttpStatus.INTERNAL_SERVER_ERROR, public context?: Record<string, unknown>) {
    super(message, statusCode);
    this.name = 'BoohPayException';
  }
}

export class ValidationException extends BoohPayException {
  constructor(message: string, public errors?: Record<string, string[]>) {
    super(message, HttpStatus.BAD_REQUEST);
    this.name = 'ValidationException';
  }
}

export class NotFoundException extends BoohPayException {
  constructor(message: string, public context?: Record<string, unknown>) {
    super(message, HttpStatus.NOT_FOUND);
    this.name = 'NotFoundException';
  }
}

export class PaymentProviderException extends BoohPayException {
  constructor(message: string, public provider?: string, public providerError?: unknown) {
    super(message, HttpStatus.SERVICE_UNAVAILABLE);
    this.name = 'PaymentProviderException';
  }
}

export class UnauthorizedException extends BoohPayException {
  constructor(message: string = 'Unauthorized') {
    super(message, HttpStatus.UNAUTHORIZED);
    this.name = 'UnauthorizedException';
  }
}


