/**
 * Unit tests for retry logic and rate limit handling
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Octokit } from 'octokit';

// Placeholder imports - will be implemented in GREEN phase
import {
  withRetry,
  isRetryableError,
  calculateBackoff,
  checkRateLimit,
  RateLimitError,
  RetryOptions,
} from '@/github/retry.js';

describe('Retry Logic', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('isRetryableError', () => {
    it('should return true for network errors', () => {
      const error = new Error('ECONNRESET');
      expect(isRetryableError(error)).toBe(true);
    });

    it('should return true for ETIMEDOUT errors', () => {
      const error = new Error('ETIMEDOUT');
      expect(isRetryableError(error)).toBe(true);
    });

    it('should return true for 500 Internal Server Error', () => {
      const error = { status: 500, message: 'Internal Server Error' };
      expect(isRetryableError(error)).toBe(true);
    });

    it('should return true for 502 Bad Gateway', () => {
      const error = { status: 502, message: 'Bad Gateway' };
      expect(isRetryableError(error)).toBe(true);
    });

    it('should return true for 503 Service Unavailable', () => {
      const error = { status: 503, message: 'Service Unavailable' };
      expect(isRetryableError(error)).toBe(true);
    });

    it('should return false for 404 Not Found', () => {
      const error = { status: 404, message: 'Not Found' };
      expect(isRetryableError(error)).toBe(false);
    });

    it('should return false for 401 Unauthorized', () => {
      const error = { status: 401, message: 'Unauthorized' };
      expect(isRetryableError(error)).toBe(false);
    });

    it('should return false for 403 Forbidden (non-rate-limit)', () => {
      const error = { status: 403, message: 'Forbidden' };
      expect(isRetryableError(error)).toBe(false);
    });

    it('should return false for validation errors', () => {
      const error = new Error('Validation failed');
      expect(isRetryableError(error)).toBe(false);
    });
  });

  describe('calculateBackoff', () => {
    it('should calculate exponential backoff for attempt 1', () => {
      const backoff = calculateBackoff(1);
      // With jitter (±10%), expect around 1000ms
      expect(backoff).toBeGreaterThanOrEqual(900);
      expect(backoff).toBeLessThanOrEqual(1100);
    });

    it('should calculate exponential backoff for attempt 2', () => {
      const backoff = calculateBackoff(2);
      // With jitter (±10%), expect around 2000ms
      expect(backoff).toBeGreaterThanOrEqual(1800);
      expect(backoff).toBeLessThanOrEqual(2200);
    });

    it('should calculate exponential backoff for attempt 3', () => {
      const backoff = calculateBackoff(3);
      // With jitter (±10%), expect around 4000ms
      expect(backoff).toBeGreaterThanOrEqual(3600);
      expect(backoff).toBeLessThanOrEqual(4400);
    });

    it('should cap backoff at maximum value', () => {
      const backoff = calculateBackoff(10);
      // Max delay is 30000ms, with ±10% jitter, max is 33000ms
      expect(backoff).toBeLessThanOrEqual(33000);
    });

    it('should add jitter to avoid thundering herd', () => {
      const backoff1 = calculateBackoff(2);
      const backoff2 = calculateBackoff(2);
      // With jitter, values might differ slightly
      expect(Math.abs(backoff1 - backoff2)).toBeLessThan(500);
    });
  });

  describe('withRetry', () => {
    it('should execute function successfully on first attempt', async () => {
      const mockFn = vi.fn().mockResolvedValue('success');

      const result = await withRetry(mockFn);

      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should retry on retryable error and eventually succeed', async () => {
      const mockFn = vi
        .fn()
        .mockRejectedValueOnce(new Error('ECONNRESET'))
        .mockRejectedValueOnce(new Error('ETIMEDOUT'))
        .mockResolvedValue('success');

      const promise = withRetry(mockFn, { maxRetries: 3 });

      // Fast-forward through retry delays
      await vi.runAllTimersAsync();

      const result = await promise;

      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(3);
    });

    it('should throw error after max retries exceeded', async () => {
      const mockFn = vi.fn().mockRejectedValue(new Error('ECONNRESET'));

      const promise = withRetry(mockFn, { maxRetries: 3 });

      // Run timers and wait for promise rejection
      const [, error] = await Promise.all([
        vi.runAllTimersAsync(),
        promise.catch((e: any) => e),
      ]);

      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toBe('ECONNRESET');
      expect(mockFn).toHaveBeenCalledTimes(4); // Initial + 3 retries
    });

    it('should not retry on non-retryable error', async () => {
      const mockFn = vi.fn().mockRejectedValue({ status: 404, message: 'Not Found' });

      await expect(withRetry(mockFn, { maxRetries: 3 })).rejects.toThrow();
      expect(mockFn).toHaveBeenCalledTimes(1); // No retries
    });

    it('should respect custom retry options', async () => {
      const mockFn = vi
        .fn()
        .mockRejectedValueOnce(new Error('ECONNRESET'))
        .mockResolvedValue('success');

      const options: RetryOptions = {
        maxRetries: 1,
        baseDelay: 500,
      };

      const promise = withRetry(mockFn, options);

      await vi.runAllTimersAsync();

      const result = await promise;

      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(2);
    });

    it('should call onRetry callback when retrying', async () => {
      const mockFn = vi
        .fn()
        .mockRejectedValueOnce(new Error('ECONNRESET'))
        .mockResolvedValue('success');

      const onRetry = vi.fn();

      const promise = withRetry(mockFn, { maxRetries: 3, onRetry });

      await vi.runAllTimersAsync();

      await promise;

      expect(onRetry).toHaveBeenCalledTimes(1);
      expect(onRetry).toHaveBeenCalledWith(expect.any(Error), 1);
    });
  });

  describe('RateLimitError', () => {
    it('should create rate limit error with reset time', () => {
      const resetAt = new Date(Date.now() + 3600000); // 1 hour from now
      const error = new RateLimitError(resetAt);

      expect(error.message).toContain('Rate limit exceeded');
      expect(error.resetAt).toEqual(resetAt);
      expect(error.name).toBe('RateLimitError');
    });

    it('should include human-readable reset time in message', () => {
      const resetAt = new Date(Date.now() + 3600000);
      const error = new RateLimitError(resetAt);

      expect(error.message).toMatch(/\d{2}:\d{2}/); // HH:MM format
    });
  });

  describe('checkRateLimit', () => {
    it('should not throw if rate limit is sufficient', async () => {
      const mockClient = {
        rest: {
          rateLimit: {
            get: vi.fn().mockResolvedValue({
              data: {
                rate: {
                  remaining: 100,
                  limit: 5000,
                  reset: Math.floor(Date.now() / 1000) + 3600,
                },
              },
            }),
          },
        },
      } as unknown as Octokit;

      await expect(checkRateLimit(mockClient)).resolves.not.toThrow();
    });

    it('should throw RateLimitError if rate limit is 0', async () => {
      const resetTime = Math.floor(Date.now() / 1000) + 3600;
      const mockClient = {
        rest: {
          rateLimit: {
            get: vi.fn().mockResolvedValue({
              data: {
                rate: {
                  remaining: 0,
                  limit: 5000,
                  reset: resetTime,
                },
              },
            }),
          },
        },
      } as unknown as Octokit;

      await expect(checkRateLimit(mockClient)).rejects.toThrow(RateLimitError);
    });

    it('should throw warning if rate limit is low (< 10)', async () => {
      const mockClient = {
        rest: {
          rateLimit: {
            get: vi.fn().mockResolvedValue({
              data: {
                rate: {
                  remaining: 5,
                  limit: 5000,
                  reset: Math.floor(Date.now() / 1000) + 3600,
                },
              },
            }),
          },
        },
      } as unknown as Octokit;

      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      await checkRateLimit(mockClient);

      expect(warnSpy).toHaveBeenCalled();

      warnSpy.mockRestore();
    });

    it('should return rate limit info', async () => {
      const resetTime = Math.floor(Date.now() / 1000) + 3600;
      const mockClient = {
        rest: {
          rateLimit: {
            get: vi.fn().mockResolvedValue({
              data: {
                rate: {
                  remaining: 100,
                  limit: 5000,
                  reset: resetTime,
                },
              },
            }),
          },
        },
      } as unknown as Octokit;

      const info = await checkRateLimit(mockClient);

      expect(info).toEqual({
        remaining: 100,
        limit: 5000,
        resetAt: expect.any(Date),
      });
    });
  });
});
