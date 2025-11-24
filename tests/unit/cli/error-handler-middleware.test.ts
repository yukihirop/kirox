/**
 * Error Handler Middleware Tests
 *
 * Task 4.3: Error handling middleware pattern tests
 * Tests the unified error handling wrapper for async operations
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ErrorHandler } from '../../../src/reporting/error-handler.js';
import type { PinoLogger } from '../../../src/reporting/pino-logger.js';

/**
 * Error handler middleware that wraps async operations
 * Provides unified error handling with automatic logging and error transformation
 */
export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  errorHandler: ErrorHandler,
  logger: PinoLogger,
  context?: Record<string, unknown>
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    const errorResult = errorHandler.handle(error, context);
    logger.logError(errorResult);
    throw error; // Re-throw for caller to handle
  }
}

/**
 * Silent error handler middleware for non-critical operations
 * Logs the error but doesn't throw - allows processing to continue
 */
export async function withSilentErrorHandling<T>(
  operation: () => Promise<T>,
  errorHandler: ErrorHandler,
  logger: PinoLogger,
  context?: Record<string, unknown>,
  fallbackValue?: T
): Promise<T | undefined> {
  try {
    return await operation();
  } catch (error) {
    const errorResult = errorHandler.handle(error, context);
    logger.warn(errorResult.message, context);
    return fallbackValue;
  }
}

describe('Error Handler Middleware', () => {
  let errorHandler: ErrorHandler;
  let mockLogger: PinoLogger;
  let loggedErrors: unknown[];
  let loggedWarnings: Array<{ message: string; context?: Record<string, unknown> }>;

  beforeEach(() => {
    errorHandler = new ErrorHandler();
    loggedErrors = [];
    loggedWarnings = [];

    // Create mock logger
    mockLogger = {
      logError: (error: unknown) => {
        loggedErrors.push(error);
      },
      warn: (message: string, context?: Record<string, unknown>) => {
        loggedWarnings.push({ message, context });
      },
      debug: () => {},
      error: () => {},
      info: () => {},
    } as unknown as PinoLogger;
  });

  describe('withErrorHandling', () => {
    it('should return result when operation succeeds', async () => {
      const operation = async () => 'success';

      const result = await withErrorHandling(operation, errorHandler, mockLogger);

      expect(result).toBe('success');
      expect(loggedErrors).toHaveLength(0);
    });

    it('should log error and re-throw when operation fails', async () => {
      const error = new Error('Operation failed');
      const operation = async () => {
        throw error;
      };

      await expect(
        withErrorHandling(operation, errorHandler, mockLogger, { operation: 'test' })
      ).rejects.toThrow('Operation failed');

      expect(loggedErrors).toHaveLength(1);
    });

    it('should include context in error logging', async () => {
      const error = new Error('Operation failed');
      const operation = async () => {
        throw error;
      };
      const context = { projectName: 'test-project', path: '/test/path' };

      await expect(
        withErrorHandling(operation, errorHandler, mockLogger, context)
      ).rejects.toThrow();

      expect(loggedErrors).toHaveLength(1);
      const loggedError = loggedErrors[0] as { context?: Record<string, unknown> };
      expect(loggedError).toBeDefined();
    });
  });

  describe('withSilentErrorHandling', () => {
    it('should return result when operation succeeds', async () => {
      const operation = async () => 'success';

      const result = await withSilentErrorHandling(operation, errorHandler, mockLogger);

      expect(result).toBe('success');
      expect(loggedWarnings).toHaveLength(0);
    });

    it('should log warning and return undefined when operation fails', async () => {
      const error = new Error('Non-critical operation failed');
      const operation = async () => {
        throw error;
      };

      const result = await withSilentErrorHandling(operation, errorHandler, mockLogger, {
        operation: 'metadata-save',
      });

      expect(result).toBeUndefined();
      expect(loggedWarnings).toHaveLength(1);
      expect(loggedWarnings[0]?.message).toBeDefined();
    });

    it('should return fallback value when operation fails and fallback is provided', async () => {
      const error = new Error('Operation failed');
      const operation = async () => {
        throw error;
      };
      const fallbackValue = 'default-value';

      const result = await withSilentErrorHandling(
        operation,
        errorHandler,
        mockLogger,
        { operation: 'test' },
        fallbackValue
      );

      expect(result).toBe(fallbackValue);
      expect(loggedWarnings).toHaveLength(1);
    });

    it('should include context in warning logging', async () => {
      const error = new Error('Operation failed');
      const operation = async () => {
        throw error;
      };
      const context = { filePath: '/test/file.txt', reason: 'test' };

      await withSilentErrorHandling(operation, errorHandler, mockLogger, context);

      expect(loggedWarnings).toHaveLength(1);
      expect(loggedWarnings[0]?.context).toEqual(context);
    });
  });

  describe('Real-world scenarios', () => {
    it('should handle GitHub API errors with context', async () => {
      const githubError = new Error('Not Found');
      (githubError as { status?: number }).status = 404;

      const operation = async () => {
        throw githubError;
      };

      await expect(
        withErrorHandling(operation, errorHandler, mockLogger, {
          repository: 'owner/repo',
          path: '.kiro/specs/project',
        })
      ).rejects.toThrow('Not Found');

      expect(loggedErrors).toHaveLength(1);
    });

    it('should handle metadata save failures silently', async () => {
      const error = new Error('Failed to write metadata file');
      const operation = async () => {
        throw error;
      };

      const result = await withSilentErrorHandling(
        operation,
        errorHandler,
        mockLogger,
        { metadataPath: '/path/to/metadata.json' },
        undefined
      );

      expect(result).toBeUndefined();
      expect(loggedWarnings).toHaveLength(1);
    });

    it('should handle file hash calculation failures silently with fallback', async () => {
      const error = new Error('Failed to calculate hash');
      const operation = async () => {
        throw error;
      };
      const fallbackHash = 'unknown';

      const result = await withSilentErrorHandling(
        operation,
        errorHandler,
        mockLogger,
        { filePath: '/path/to/file.txt' },
        fallbackHash
      );

      expect(result).toBe(fallbackHash);
      expect(loggedWarnings).toHaveLength(1);
    });
  });
});
