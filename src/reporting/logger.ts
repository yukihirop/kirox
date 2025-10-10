/**
 * Logger
 *
 * Provides structured logging with different log levels
 */

import type { LogLevel, ErrorResult } from './types.js';

/**
 * Logger for structured console output
 *
 * Supports INFO, WARN, and ERROR log levels with timestamp formatting
 */
export class Logger {
  /**
   * Log INFO level message to stdout
   *
   * @param message - Information message
   * @param details - Optional details object
   *
   * @example
   * ```typescript
   * logger.info('Operation started', { repository: 'owner/repo' });
   * // Output: [INFO] 2025-10-06T12:00:00 Operation started {"repository":"owner/repo"}
   * ```
   */
  info(message: string, details?: unknown): void {
    const formatted = this.formatLogMessage('INFO', message, details);
    console.log(formatted);
  }

  /**
   * Log WARN level message to stdout
   *
   * @param message - Warning message
   * @param details - Optional details object
   *
   * @example
   * ```typescript
   * logger.warn('File skipped', { file: 'large.md', size: 2000000 });
   * // Output: [WARN] 2025-10-06T12:00:00 File skipped {"file":"large.md","size":2000000}
   * ```
   */
  warn(message: string, details?: unknown): void {
    const formatted = this.formatLogMessage('WARN', message, details);
    console.log(formatted);
  }

  /**
   * Log ERROR level message to stderr
   *
   * @param message - Error message
   * @param details - Optional details object
   *
   * @example
   * ```typescript
   * logger.error('Operation failed', { code: 'ERR_001', reason: 'timeout' });
   * // Output: [ERROR] 2025-10-06T12:00:00 Operation failed {"code":"ERR_001","reason":"timeout"}
   * ```
   */
  error(message: string, details?: unknown): void {
    const formatted = this.formatLogMessage('ERROR', message, details);
    console.error(formatted);
  }

  /**
   * Log verbose debug message to stdout
   *
   * @param message - Verbose debug message
   * @param details - Optional details object
   *
   * @example
   * ```typescript
   * logger.verbose('Fetching tree SHA', { repository: 'owner/repo#branch' });
   * // Output: [VERBOSE] 2025-10-06T12:00:00 Fetching tree SHA {"repository":"owner/repo#branch"}
   * ```
   */
  verbose(message: string, details?: unknown): void {
    const formatted = this.formatLogMessage('VERBOSE', message, details);
    console.log(formatted);
  }

  /**
   * Log error result with appropriate level
   *
   * Recoverable errors are logged as WARN, fatal errors as ERROR
   *
   * @param errorResult - Error result from ErrorHandler
   *
   * @example
   * ```typescript
   * const errorResult = { type: 'NETWORK_ERROR', message: 'Connection failed', exitCode: 2, recoverable: true };
   * logger.logError(errorResult);
   * // Output: [WARN] 2025-10-06T12:00:00 NETWORK_ERROR: Connection failed {"exitCode":2}
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

  /**
   * Format timestamp in ISO 8601 format
   *
   * @param date - Date to format (defaults to current time)
   * @returns ISO 8601 formatted timestamp
   *
   * @example
   * ```typescript
   * logger.formatTimestamp(new Date('2025-10-06T12:00:00Z'));
   * // Returns: "2025-10-06T12:00:00"
   * ```
   */
  formatTimestamp(date: Date = new Date()): string {
    const isoString = date.toISOString();
    const withoutMilliseconds = isoString.split('.')[0];
    return withoutMilliseconds ?? isoString; // Fallback to full ISO string
  }

  /**
   * Format log message with level, timestamp, and details
   *
   * @param level - Log level
   * @param message - Log message
   * @param details - Optional details object
   * @returns Formatted log message
   *
   * @example
   * ```typescript
   * logger.formatLogMessage('INFO', 'Test', { key: 'value' });
   * // Returns: "[INFO] 2025-10-06T12:00:00 Test {\"key\":\"value\"}"
   * ```
   */
  formatLogMessage(level: LogLevel, message: string, details?: unknown): string {
    const timestamp = this.formatTimestamp();
    const levelTag = `[${level}]`;
    const detailsStr = details ? ` ${JSON.stringify(details)}` : '';

    return `${levelTag} ${timestamp} ${message}${detailsStr}`;
  }
}
