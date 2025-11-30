import type { ErrorHandler } from '../reporting/error-handler.js';
import type { PinoLogger } from '../reporting/pino-logger.js';

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
