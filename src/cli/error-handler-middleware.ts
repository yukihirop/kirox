/**
 * Error Handler Middleware
 *
 * Task 4.3: Unified error handling middleware pattern
 * Provides consistent error handling wrappers for async operations
 */

import type { ErrorHandler } from '../reporting/error-handler.js';
import type { PinoLogger } from '../reporting/pino-logger.js';

/**
 * Error handler middleware that wraps async operations
 * Provides unified error handling with automatic logging and error transformation
 *
 * @param operation - Async operation to execute
 * @param errorHandler - Error handler instance
 * @param logger - Logger instance
 * @param context - Additional context for error logging
 * @returns Result of the operation
 * @throws Re-throws the error after logging for caller to handle
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
    throw error;
  }
}

/**
 * Silent error handler middleware for non-critical operations
 * Logs the error but doesn't throw - allows processing to continue
 *
 * Use this for operations where failure shouldn't stop the main process:
 * - Metadata saving (files are already downloaded)
 * - Hash calculation (can continue without hash)
 * - Optional directory fetching (steering directory)
 *
 * @param operation - Async operation to execute
 * @param errorHandler - Error handler instance
 * @param logger - Logger instance
 * @param context - Additional context for error logging
 * @param fallbackValue - Value to return if operation fails (default: undefined)
 * @returns Result of the operation or fallbackValue if failed
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
