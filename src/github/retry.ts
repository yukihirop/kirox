import type { Octokit } from 'octokit';

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

export interface RetryOptions {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
  onRetry?: (error: Error, attempt: number) => void;
}

interface RateLimitInfo {
  remaining: number;
  limit: number;
  resetAt: Date;
}

export function isRetryableError(error: unknown): boolean {
  if (!error) {
    return false;
  }

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

  if (typeof error === 'object' && 'status' in error) {
    const status = (error as { status: number }).status;
    if (status >= 500 && status < 600) {
      return true;
    }
  }

  return false;
}

export function calculateBackoff(
  attempt: number,
  baseDelay: number = 1000,
  maxDelay: number = 30000
): number {
  const exponentialDelay = baseDelay * Math.pow(2, attempt - 1);

  const cappedDelay = Math.min(exponentialDelay, maxDelay);

  const jitter = cappedDelay * 0.1 * (Math.random() * 2 - 1);

  return Math.floor(cappedDelay + jitter);
}

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

      if (!isRetryableError(error)) {
        throw lastError;
      }

      if (attempt === maxRetries) {
        throw lastError;
      }

      const delay = calculateBackoff(attempt + 1, baseDelay, maxDelay);

      if (onRetry) {
        onRetry(lastError, attempt + 1);
      }

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}

export async function checkRateLimit(client: Octokit): Promise<RateLimitInfo> {
  try {
    const response = await client.rest.rateLimit.get();
    const { remaining, limit, reset } = response.data.rate;

    const resetAt = new Date(reset * 1000);

    if (remaining === 0) {
      throw new RateLimitError(resetAt);
    }

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
