/**
 * Unit tests for Error Handler
 */

import { describe, it, expect } from 'vitest';
import { ErrorHandler } from '@/reporting/error-handler';
import type { ErrorContext } from '@/reporting/types';

describe('ErrorHandler', () => {
  const handler = new ErrorHandler();

  describe('classifyError', () => {
    it('should classify 404 error as REPOSITORY_NOT_FOUND', () => {
      const error = Object.assign(new Error('Not Found'), { status: 404 });

      const result = handler.classifyError(error);

      expect(result.type).toBe('REPOSITORY_NOT_FOUND');
    });

    it('should classify ENOTFOUND error as NETWORK_ERROR', () => {
      const error = Object.assign(new Error('getaddrinfo ENOTFOUND'), {
        code: 'ENOTFOUND',
      });

      const result = handler.classifyError(error);

      expect(result.type).toBe('NETWORK_ERROR');
    });

    it('should classify ECONNREFUSED error as NETWORK_ERROR', () => {
      const error = Object.assign(new Error('connect ECONNREFUSED'), {
        code: 'ECONNREFUSED',
      });

      const result = handler.classifyError(error);

      expect(result.type).toBe('NETWORK_ERROR');
    });

    it('should classify 403 error as ACCESS_DENIED', () => {
      const error = Object.assign(new Error('Forbidden'), { status: 403 });

      const result = handler.classifyError(error);

      expect(result.type).toBe('ACCESS_DENIED');
    });

    it('should classify rate limit error as RATE_LIMIT', () => {
      const error = Object.assign(new Error('API rate limit exceeded'), {
        status: 429,
      });

      const result = handler.classifyError(error);

      expect(result.type).toBe('RATE_LIMIT');
    });

    it('should classify EACCES error as FILESYSTEM_ERROR', () => {
      const error = Object.assign(new Error('permission denied'), {
        code: 'EACCES',
      });

      const result = handler.classifyError(error);

      expect(result.type).toBe('FILESYSTEM_ERROR');
    });

    it('should classify ENOSPC error as FILESYSTEM_ERROR', () => {
      const error = Object.assign(new Error('no space left'), {
        code: 'ENOSPC',
      });

      const result = handler.classifyError(error);

      expect(result.type).toBe('FILESYSTEM_ERROR');
    });

    it('should classify validation error as VALIDATION_ERROR', () => {
      const error = new Error('Invalid repository format');

      const result = handler.classifyError(error);

      expect(result.type).toBe('VALIDATION_ERROR');
    });

    it('should classify unknown error as UNKNOWN', () => {
      const error = new Error('Some random error');

      const result = handler.classifyError(error);

      expect(result.type).toBe('UNKNOWN');
    });
  });

  describe('formatMessage', () => {
    it('should format REPOSITORY_NOT_FOUND message with repository name', () => {
      const context: ErrorContext = { repository: 'owner/repo' };

      const message = handler.formatMessage('REPOSITORY_NOT_FOUND', context);

      expect(message).toContain('owner/repo');
      expect(message).toContain('見つかりません');
    });

    it('should format PROJECT_NOT_FOUND message with project name', () => {
      const context: ErrorContext = {
        repository: 'owner/repo',
        project: 'my-project',
      };

      const message = handler.formatMessage('PROJECT_NOT_FOUND', context);

      expect(message).toContain('my-project');
      expect(message).toContain('見つかりません');
    });

    it('should format NETWORK_ERROR message', () => {
      const context: ErrorContext = {};

      const message = handler.formatMessage('NETWORK_ERROR', context);

      expect(message).toContain('接続');
      expect(message).toContain('エラー');
    });

    it('should format RATE_LIMIT message', () => {
      const context: ErrorContext = {};

      const message = handler.formatMessage('RATE_LIMIT', context);

      expect(message).toContain('API制限');
      expect(message).toContain('待って');
    });

    it('should format ACCESS_DENIED message', () => {
      const context: ErrorContext = { repository: 'owner/private-repo' };

      const message = handler.formatMessage('ACCESS_DENIED', context);

      expect(message).toContain('アクセス権限');
      expect(message).toContain('ありません');
    });

    it('should format FILE_TOO_LARGE message with file path', () => {
      const context: ErrorContext = { filePath: 'large-file.md' };

      const message = handler.formatMessage('FILE_TOO_LARGE', context);

      expect(message).toContain('large-file.md');
      expect(message).toContain('大きすぎます');
    });

    it('should format TOO_MANY_FILES message with count', () => {
      const context: ErrorContext = { count: 150 };

      const message = handler.formatMessage('TOO_MANY_FILES', context);

      expect(message).toContain('150');
      expect(message).toContain('多すぎます');
    });

    it('should format FILESYSTEM_ERROR message', () => {
      const context: ErrorContext = { details: 'permission denied' };

      const message = handler.formatMessage('FILESYSTEM_ERROR', context);

      expect(message).toContain('ファイルシステム');
      expect(message).toContain('エラー');
    });

    it('should format VALIDATION_ERROR message', () => {
      const context: ErrorContext = { details: 'Invalid format' };

      const message = handler.formatMessage('VALIDATION_ERROR', context);

      expect(message).toContain('入力');
      expect(message).toContain('不正');
    });
  });

  describe('handle', () => {
    it('should return ErrorResult with correct exit code for VALIDATION_ERROR', () => {
      const error = new Error('Invalid input');

      const result = handler.handle(error);

      expect(result.type).toBe('VALIDATION_ERROR');
      expect(result.exitCode).toBe(1);
      expect(result.recoverable).toBe(false);
    });

    it('should return ErrorResult with correct exit code for NETWORK_ERROR', () => {
      const error = Object.assign(new Error('ECONNREFUSED'), {
        code: 'ECONNREFUSED',
      });

      const result = handler.handle(error);

      expect(result.type).toBe('NETWORK_ERROR');
      expect(result.exitCode).toBe(2);
      expect(result.recoverable).toBe(true);
    });

    it('should return ErrorResult with formatted message', () => {
      const error = Object.assign(new Error('Not Found'), { status: 404 });

      const result = handler.handle(error, { repository: 'owner/repo' });

      expect(result.message).toContain('owner/repo');
      expect(result.message).toContain('見つかりません');
    });

    it('should mark RATE_LIMIT as recoverable', () => {
      const error = Object.assign(new Error('Rate limit'), { status: 429 });

      const result = handler.handle(error);

      expect(result.type).toBe('RATE_LIMIT');
      expect(result.recoverable).toBe(true);
    });

    it('should mark ACCESS_DENIED as non-recoverable', () => {
      const error = Object.assign(new Error('Forbidden'), { status: 403 });

      const result = handler.handle(error);

      expect(result.type).toBe('ACCESS_DENIED');
      expect(result.recoverable).toBe(false);
    });
  });
});
