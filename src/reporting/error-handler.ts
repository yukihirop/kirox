/**
 * Error Handler
 *
 * Classifies errors and generates user-friendly messages
 */

import type { ErrorType, ErrorResult, ErrorContext } from './types.js';

/**
 * Error Handler for CLI operations
 *
 * Provides error classification, message formatting, and error handling logic
 */
export class ErrorHandler {
  /**
   * Classify error by type
   *
   * Analyzes error object and determines appropriate error type
   *
   * @param error - Error object to classify
   * @returns Classification result with error type
   */
  classifyError(error: unknown): { type: ErrorType } {
    if (!(error instanceof Error)) {
      return { type: 'UNKNOWN' };
    }

    // Check HTTP status codes
    const errorWithStatus = error as Error & { status?: number };
    if (errorWithStatus.status) {
      if (errorWithStatus.status === 404) {
        return { type: 'REPOSITORY_NOT_FOUND' };
      }
      if (errorWithStatus.status === 403) {
        return { type: 'ACCESS_DENIED' };
      }
      if (errorWithStatus.status === 429) {
        return { type: 'RATE_LIMIT' };
      }
    }

    // Check error codes
    const errorWithCode = error as Error & { code?: string };
    if (errorWithCode.code) {
      if (
        errorWithCode.code === 'ENOTFOUND' ||
        errorWithCode.code === 'ECONNREFUSED'
      ) {
        return { type: 'NETWORK_ERROR' };
      }
      if (
        errorWithCode.code === 'EACCES' ||
        errorWithCode.code === 'ENOSPC'
      ) {
        return { type: 'FILESYSTEM_ERROR' };
      }
    }

    // Check error message patterns
    const message = error.message.toLowerCase();
    if (
      message.includes('invalid') ||
      message.includes('validation') ||
      message.includes('format')
    ) {
      return { type: 'VALIDATION_ERROR' };
    }

    return { type: 'UNKNOWN' };
  }

  /**
   * Format error message with context
   *
   * Generates user-friendly message based on error type and context
   *
   * @param type - Error type
   * @param context - Error context information
   * @returns Formatted error message
   */
  formatMessage(type: ErrorType, context: ErrorContext): string {
    switch (type) {
      case 'REPOSITORY_NOT_FOUND':
        return `Repository '${context.repository}' not found`;

      case 'PROJECT_NOT_FOUND':
        return `Project '${context.project}' not found`;

      case 'NETWORK_ERROR':
        return 'Network connection error';

      case 'RATE_LIMIT':
        return 'GitHub API rate limit reached. Please wait and try again later';

      case 'ACCESS_DENIED':
        return 'Access denied. Please check your repository access permissions';

      case 'FILE_TOO_LARGE':
        return `File '${context.filePath}' is too large (limit: 1MB)`;

      case 'TOO_MANY_FILES':
        return `Too many files (${context.count}, limit: 100)`;

      case 'FILESYSTEM_ERROR':
        return `Filesystem error: ${context.details || 'Unknown error'}`;

      case 'VALIDATION_ERROR':
        return `Invalid input: ${context.details || 'Please check your input'}`;

      case 'UNKNOWN':
        return `Unknown error: ${context.details || 'No error details available'}`;

      default:
        return 'Error occurred';
    }
  }

  /**
   * Handle error and generate result
   *
   * Classifies error, formats message, and determines exit code and recoverability
   *
   * @param error - Error object
   * @param context - Optional error context
   * @returns Error result with type, message, exit code, and recoverability
   */
  handle(error: unknown, context: ErrorContext = {}): ErrorResult {
    const { type } = this.classifyError(error);
    const message = this.formatMessage(type, context);

    // Determine exit code based on error type
    let exitCode = 1; // Default: user error
    if (
      type === 'NETWORK_ERROR' ||
      type === 'FILESYSTEM_ERROR' ||
      type === 'UNKNOWN'
    ) {
      exitCode = 2; // System error
    }

    // Determine recoverability
    const recoverable =
      type === 'NETWORK_ERROR' ||
      type === 'RATE_LIMIT';

    return {
      type,
      message,
      exitCode,
      recoverable,
    };
  }
}
