import { HttpStatus } from '@nestjs/common';
import {
  BoohPayException,
  ValidationException,
  NotFoundException,
  PaymentProviderException,
  UnauthorizedException,
} from './boohpay.exception';

describe('BoohPayException', () => {
  it('should create BoohPayException with default status', () => {
    const exception = new BoohPayException('Test error');
    expect(exception.message).toBe('Test error');
    expect(exception.getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
  });

  it('should create BoohPayException with custom status', () => {
    const exception = new BoohPayException('Test error', HttpStatus.BAD_REQUEST);
    expect(exception.getStatus()).toBe(HttpStatus.BAD_REQUEST);
  });
});

describe('ValidationException', () => {
  it('should create ValidationException with BAD_REQUEST status', () => {
    const exception = new ValidationException('Validation failed');
    expect(exception.getStatus()).toBe(HttpStatus.BAD_REQUEST);
    expect(exception.message).toBe('Validation failed');
  });

  it('should include errors object', () => {
    const errors = { email: ['Email is required'] };
    const exception = new ValidationException('Validation failed', errors);
    expect(exception.errors).toEqual(errors);
  });
});

describe('NotFoundException', () => {
  it('should create NotFoundException with NOT_FOUND status', () => {
    const exception = new NotFoundException('Resource not found');
    expect(exception.getStatus()).toBe(HttpStatus.NOT_FOUND);
    expect(exception.message).toBe('Resource not found');
  });
});

describe('PaymentProviderException', () => {
  it('should create PaymentProviderException with SERVICE_UNAVAILABLE status', () => {
    const exception = new PaymentProviderException('Provider error');
    expect(exception.getStatus()).toBe(HttpStatus.SERVICE_UNAVAILABLE);
    expect(exception.message).toBe('Provider error');
  });

  it('should include provider and originalError', () => {
    const originalError = new Error('Original error');
    const exception = new PaymentProviderException('Provider error', 'stripe', originalError);
    expect(exception.provider).toBe('stripe');
    expect(exception.providerError).toBe(originalError);
  });
});

describe('UnauthorizedException', () => {
  it('should create UnauthorizedException with UNAUTHORIZED status', () => {
    const exception = new UnauthorizedException();
    expect(exception.getStatus()).toBe(HttpStatus.UNAUTHORIZED);
    expect(exception.message).toBe('Unauthorized');
  });

  it('should allow custom message', () => {
    const exception = new UnauthorizedException('Custom unauthorized message');
    expect(exception.message).toBe('Custom unauthorized message');
  });
});

