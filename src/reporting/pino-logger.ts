/**
 * PinoLogger
 *
 * Lightweight logger wrapper around Pino library with log level control
 */

import pino from 'pino';
import type { ErrorResult } from './types.js';

/**
 * PinoLogger options
 */
export interface PinoLoggerOptions {
  timestamp?: boolean; // Show timestamp (default: true)
  formatMessage?: boolean; // Format message in existing style (default: true)
}

/**
 * PinoLogger: Wrapper around Pino library for log level control
 *
 * Provides compatibility with existing Logger API while leveraging Pino's log level control
 */
export class PinoLogger {
  private pino: pino.Logger;

  /**
   * Create PinoLogger instance
   *
   * @param verbose - If true, set level to debug; if false, set level to info
   * @param options - Pino options (timestamp display, etc.)
   */
  constructor(verbose: boolean, options?: PinoLoggerOptions) {
    // Initialize Pino with log level based on verbose flag
    this.pino = pino({
      level: verbose ? 'debug' : 'info',
      timestamp: options?.timestamp !== false, // Default: true
    });
  }

  /**
   * Log INFO level message
   *
   * @param message - Log message
   * @param details - Optional details object (structured data)
   *
   * @example
   * ```typescript
   * logger.info('Operation started', { repository: 'owner/repo' });
   * ```
   */
  info(message: string, details?: Record<string, unknown>): void {
    this.pino.info(details, message);
  }

  /**
   * Log WARN level message
   *
   * @param message - Warning message
   * @param details - Optional details object (structured data)
   *
   * @example
   * ```typescript
   * logger.warn('File skipped', { file: 'large.md', size: 2000000 });
   * ```
   */
  warn(message: string, details?: Record<string, unknown>): void {
    this.pino.warn(details, message);
  }

  /**
   * Log ERROR level message to stderr
   *
   * @param message - Error message
   * @param details - Optional details object (structured data)
   *
   * @example
   * ```typescript
   * logger.error('Operation failed', { code: 'ERR_001', reason: 'timeout' });
   * ```
   */
  error(message: string, details?: Record<string, unknown>): void {
    this.pino.error(details, message);
  }

  /**
   * Log DEBUG level message (verbose equivalent)
   *
   * @param message - Debug message
   * @param details - Optional details object (structured data)
   *
   * Precondition: None
   * Postcondition: If verbose=true, output to stdout; if verbose=false, suppressed
   *
   * @example
   * ```typescript
   * logger.debug('Fetching tree SHA', { repository: 'owner/repo#branch' });
   * ```
   */
  debug(message: string, details?: Record<string, unknown>): void {
    this.pino.debug(details, message);
  }

  /**
   * Log error result with appropriate level
   *
   * Recoverable errors are logged as WARN, fatal errors as ERROR
   *
   * @param errorResult - Error result from ErrorHandler
   *
   * Precondition: errorResult must be a valid ErrorResult type
   * Postcondition: If recoverable=true, output as warn; if false, output as error
   *
   * @example
   * ```typescript
   * const errorResult = { type: 'NETWORK_ERROR', message: 'Connection failed', exitCode: 2, recoverable: true };
   * logger.logError(errorResult);
   * ```
   */
  logError(errorResult: ErrorResult): void {
    const { type, message, exitCode, recoverable } = errorResult;

    const errorMessage = `${type}: ${message}`;
    const details = { exitCode };

    if (recoverable) {
      this.warn(errorMessage, details);
    } else {
      this.error(errorMessage, details);
    }
  }
}
