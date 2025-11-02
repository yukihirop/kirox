/**
 * Integration tests for error recovery flows
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { withRetry, isRetryableError } from '@/github/retry.js';
import { Octokit } from 'octokit';

vi.mock('octokit');

describe('Error Recovery Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Network error retry', () => {
    it('should retry on network errors with exponential backoff', async () => {
      let attemptCount = 0;
      const mockFn = vi.fn().mockImplementation(async () => {
        attemptCount++;
        if (attemptCount < 3) {
          const error = new Error('ECONNREFUSED');
          (error as any).code = 'ECONNREFUSED';
          throw error;
        }
        return 'success';
      });

      const result = await withRetry(mockFn, {
        maxRetries: 3,
        baseDelay: 10, // Short delay for tests
        maxDelay: 100,
      });

      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(3);
    });

    it('should fail after max retries are exhausted', async () => {
      const mockFn = vi.fn().mockImplementation(async () => {
        const error = new Error('ETIMEDOUT');
        (error as any).code = 'ETIMEDOUT';
        throw error;
      });

      await expect(
        withRetry(mockFn, {
          maxRetries: 2,
          baseDelay: 10,
        })
      ).rejects.toThrow('ETIMEDOUT');

      expect(mockFn).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });

    it('should not retry on non-retryable errors', async () => {
      const mockFn = vi.fn().mockImplementation(async () => {
        const error = new Error('Not Found');
        (error as any).status = 404;
        throw error;
      });

      await expect(
        withRetry(mockFn, {
          maxRetries: 3,
          baseDelay: 10,
        })
      ).rejects.toThrow('Not Found');

      expect(mockFn).toHaveBeenCalledTimes(1); // No retries
    });

    it('should call onRetry callback for each retry attempt', async () => {
      let attemptCount = 0;
      const mockFn = vi.fn().mockImplementation(async () => {
        attemptCount++;
        if (attemptCount < 2) {
          const error = new Error('ENOTFOUND');
          (error as any).code = 'ENOTFOUND';
          throw error;
        }
        return 'success';
      });

      const onRetry = vi.fn();

      await withRetry(mockFn, {
        maxRetries: 2,
        baseDelay: 10,
        onRetry,
      });

      expect(onRetry).toHaveBeenCalledTimes(1);
      expect(onRetry).toHaveBeenCalledWith(expect.any(Error), 1);
    });
  });

  describe('Retryable error classification', () => {
    it('should classify ECONNRESET as retryable', () => {
      const error = new Error('Connection reset');
      (error as any).code = 'ECONNRESET';

      expect(isRetryableError(error)).toBe(true);
    });

    it('should classify ETIMEDOUT as retryable', () => {
      const error = new Error('Timeout');
      error.message = 'ETIMEDOUT';

      expect(isRetryableError(error)).toBe(true);
    });

    it('should classify 5xx errors as retryable', () => {
      const error = new Error('Server error');
      (error as any).status = 503;

      expect(isRetryableError(error)).toBe(true);
    });

    it('should not classify 4xx errors as retryable', () => {
      const error = new Error('Bad request');
      (error as any).status = 400;

      expect(isRetryableError(error)).toBe(false);
    });
  });

  describe('Rate limit handling', () => {
    it('should detect rate limit errors', async () => {
      const mockOctokit = {
        rest: {
          rateLimit: {
            get: vi.fn().mockResolvedValue({
              data: {
                rate: {
                  remaining: 0,
                  limit: 5000,
                  reset: Date.now() / 1000 + 3600,
                },
              },
            }),
          },
        },
      };

      vi.mocked(Octokit).mockImplementation(() => mockOctokit as any);

      const { checkRateLimit } = await import('@/github/retry.js');
      const client = new Octokit();

      await expect(checkRateLimit(client)).rejects.toThrow('Rate limit exceeded');
    });

    it('should warn when rate limit is low', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const mockOctokit = {
        rest: {
          rateLimit: {
            get: vi.fn().mockResolvedValue({
              data: {
                rate: {
                  remaining: 5,
                  limit: 5000,
                  reset: Date.now() / 1000 + 3600,
                },
              },
            }),
          },
        },
      };

      vi.mocked(Octokit).mockImplementation(() => mockOctokit as any);

      const { checkRateLimit } = await import('@/github/retry.js');
      const client = new Octokit();

      await checkRateLimit(client);

      expect(consoleWarnSpy).toHaveBeenCalled();
      expect(consoleWarnSpy.mock.calls[0]![0]!).toContain('rate limit is low');

      consoleWarnSpy.mockRestore();
    });
  });
});
