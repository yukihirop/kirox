import type { ErrorType, ErrorResult, ErrorContext } from './types.js';

export class ErrorHandler {
  classifyError(error: unknown): { type: ErrorType } {
    if (!(error instanceof Error)) {
      return { type: 'UNKNOWN' };
    }

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

  handle(error: unknown, context: ErrorContext = {}): ErrorResult {
    const { type } = this.classifyError(error);
    const message = this.formatMessage(type, context);

    let exitCode = 1;
    if (
      type === 'NETWORK_ERROR' ||
      type === 'FILESYSTEM_ERROR' ||
      type === 'UNKNOWN'
    ) {
      exitCode = 2;
    }

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
