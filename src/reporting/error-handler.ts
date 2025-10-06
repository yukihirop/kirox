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
        return `リポジトリ '${context.repository}' が見つかりません`;

      case 'PROJECT_NOT_FOUND':
        return `プロジェクト '${context.project}' が見つかりません`;

      case 'NETWORK_ERROR':
        return 'ネットワーク接続エラーが発生しました';

      case 'RATE_LIMIT':
        return 'GitHub API制限に達しました。しばらく待ってから再試行してください';

      case 'ACCESS_DENIED':
        return 'アクセス権限がありません。リポジトリへのアクセス権を確認してください';

      case 'FILE_TOO_LARGE':
        return `ファイル '${context.filePath}' が大きすぎます（制限: 1MB）`;

      case 'TOO_MANY_FILES':
        return `ファイル数が多すぎます（${context.count}個、制限: 100個）`;

      case 'FILESYSTEM_ERROR':
        return `ファイルシステムエラーが発生しました: ${context.details || '不明なエラー'}`;

      case 'VALIDATION_ERROR':
        return `入力が不正です: ${context.details || '入力内容を確認してください'}`;

      case 'UNKNOWN':
        return `不明なエラーが発生しました: ${context.details || 'エラーの詳細はありません'}`;

      default:
        return 'エラーが発生しました';
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
