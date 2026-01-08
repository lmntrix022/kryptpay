import { Test, TestingModule } from '@nestjs/testing';
import { RetryService } from './retry.service';

describe('RetryService', () => {
  let service: RetryService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RetryService],
    }).compile();

    service = module.get<RetryService>(RetryService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should succeed on first attempt', async () => {
    const fn = jest.fn().mockResolvedValue('success');
    const result = await service.withRetry(fn);
    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should retry on retriable errors', async () => {
    const error = new Error('Network error');
    (error as any).status = 500;
    const fn = jest
      .fn()
      .mockRejectedValueOnce(error)
      .mockRejectedValueOnce(error)
      .mockResolvedValue('success');
    
    const result = await service.withRetry(fn, { maxRetries: 2 });
    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('should not retry on non-retriable errors', async () => {
    const error = new Error('Validation error');
    (error as any).status = 400;
    const fn = jest.fn().mockRejectedValue(error);
    
    await expect(service.withRetry(fn)).rejects.toThrow('Validation error');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should respect maxRetries', async () => {
    const error = new Error('Network error');
    (error as any).status = 500;
    const fn = jest.fn().mockRejectedValue(error);
    
    await expect(service.withRetry(fn, { maxRetries: 2 })).rejects.toThrow();
    expect(fn).toHaveBeenCalledTimes(3); // initial + 2 retries
  });
});

