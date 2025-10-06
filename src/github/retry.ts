/**
 * Retry Logic and Rate Limit Handling
 *
 * Handles automatic retries with exponential backoff for network errors
 * and GitHub API rate limit detection and management
 */

import type { Octokit } from 'octokit';

/**
 * Custom error for GitHub API rate limit exceeded
 */
export class RateLimitError extends Error {
  public readonly resetAt: Date;

  constructor(resetAt: Date) {
    const resetTimeStr = resetAt.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
    super(`Rate limit exceeded. Resets at ${resetTimeStr}`);
    this.name = 'RateLimitError';
    this.resetAt = resetAt;
  }
}

/**
 * Retry options configuration
 */
export interface RetryOptions {
  maxRetries?: number; // Maximum number of retry attempts (default: 3)
  baseDelay?: number; // Base delay in milliseconds (default: 1000)
  maxDelay?: number; // Maximum delay in milliseconds (default: 30000)
  onRetry?: (error: Error, attempt: number) => void; // Callback on retry
}

/**
 * Rate limit information
 */
export interface RateLimitInfo {
  remaining: number;
  limit: number;
  resetAt: Date;
}

/**
 * Check if an error is retryable
 *
 * @param error - Error to check
 * @returns true if error is retryable, false otherwise
 */
export function isRetryableError(error: unknown): boolean {
  if (!error) {
    return false;
  }

  // Check error code (for network errors)
  if (typeof error === 'object' && 'code' in error) {
    const code = (error as { code: string }).code;
    if (
      code === 'ECONNRESET' ||
      code === 'ECONNREFUSED' ||
      code === 'ETIMEDOUT' ||
      code === 'ENOTFOUND'
    ) {
      return true;
    }
  }

  // Network errors (ECONNRESET, ETIMEDOUT, etc.)
  if (error instanceof Error) {
    const message = error.message.toUpperCase();
    if (
      message.includes('ECONNRESET') ||
      message.includes('ETIMEDOUT') ||
      message.includes('ENOTFOUND') ||
      message.includes('NETWORK')
    ) {
      return true;
    }
  }

  // HTTP status-based errors
  if (typeof error === 'object' && 'status' in error) {
    const status = (error as { status: number }).status;
    // Retry on server errors (5xx)
    if (status >= 500 && status < 600) {
      return true;
    }
  }

  return false;
}

/**
 * Calculate exponential backoff delay with jitter
 *
 * @param attempt - Current attempt number (1-based)
 * @param baseDelay - Base delay in milliseconds (default: 1000)
 * @param maxDelay - Maximum delay in milliseconds (default: 30000)
 * @returns Delay in milliseconds
 */
export function calculateBackoff(
  attempt: number,
  baseDelay: number = 1000,
  maxDelay: number = 30000
): number {
  // Exponential backoff: baseDelay * 2^(attempt - 1)
  const exponentialDelay = baseDelay * Math.pow(2, attempt - 1);

  // Cap at max delay
  const cappedDelay = Math.min(exponentialDelay, maxDelay);

  // Add jitter (±10%) to avoid thundering herd
  const jitter = cappedDelay * 0.1 * (Math.random() * 2 - 1);

  return Math.floor(cappedDelay + jitter);
}

/**
 * Execute a function with automatic retry on failure
 *
 * @param fn - Function to execute
 * @param options - Retry options
 * @returns Result of function execution
 * @throws Error if all retries are exhausted or error is non-retryable
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    maxDelay = 30000,
    onRetry,
  } = options;

  let lastError: Error;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Check if error is retryable
      if (!isRetryableError(error)) {
        throw lastError;
      }

      // If this was the last attempt, throw
      if (attempt === maxRetries) {
        throw lastError;
      }

      // Calculate backoff delay
      const delay = calculateBackoff(attempt + 1, baseDelay, maxDelay);

      // Call retry callback if provided
      if (onRetry) {
        onRetry(lastError, attempt + 1);
      }

      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  // This should never be reached, but TypeScript requires it
  throw lastError!;
}

/**
 * Check GitHub API rate limit status
 *
 * @param client - Octokit client instance
 * @returns Rate limit information
 * @throws RateLimitError if rate limit is exceeded
 */
export async function checkRateLimit(client: Octokit): Promise<RateLimitInfo> {
  try {
    const response = await client.rest.rateLimit.get();
    const { remaining, limit, reset } = response.data.rate;

    const resetAt = new Date(reset * 1000);

    // Throw if rate limit is exhausted
    if (remaining === 0) {
      throw new RateLimitError(resetAt);
    }

    // Warn if rate limit is low (< 10 requests remaining)
    if (remaining < 10) {
      console.warn(
        `Warning: GitHub API rate limit is low (${remaining}/${limit} remaining). Resets at ${resetAt.toLocaleTimeString()}`
      );
    }

    return {
      remaining,
      limit,
      resetAt,
    };
  } catch (error) {
    if (error instanceof RateLimitError) {
      throw error;
    }
    throw new Error(
      `Failed to check rate limit: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Execute GitHub API request with retry and rate limit checking
 *
 * @param client - Octokit client instance
 * @param fn - Function to execute (GitHub API call)
 * @param options - Retry options
 * @returns Result of function execution
 * @throws Error if request fails after retries or rate limit exceeded
 */
export async function withRetryAndRateLimit<T>(
  client: Octokit,
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  // Check rate limit before making request
  await checkRateLimit(client);

  // Execute with retry logic
  return withRetry(fn, {
    ...options,
    onRetry: (error, attempt) => {
      console.log(`Retry attempt ${attempt} after error: ${error.message}`);
      if (options.onRetry) {
        options.onRetry(error, attempt);
      }
    },
  });
}
