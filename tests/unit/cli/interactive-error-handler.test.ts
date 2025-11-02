/**
 * Interactive Mode Error Handler Test
 *
 * Tests for handleInteractiveError helper function
 * Task 5.1: Ctrl+C中断処理の実装
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { handleInteractiveError } from '@/cli/interactive-prompt.js';
import { PinoLogger } from '@/reporting/pino-logger.js';

// Mock console.log
const mockConsoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});

// PinoLogger is mocked globally in tests/setup.ts

describe('handleInteractiveError', () => {
  let mockLogger: PinoLogger;

  beforeEach(() => {
    mockLogger = new PinoLogger(false);
    mockConsoleLog.mockClear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('ExitPromptError (Ctrl+C) の処理', () => {
    it('ExitPromptErrorの場合、exitCode 130を返す', () => {
      const exitError = new Error('User force closed the prompt');
      exitError.name = 'ExitPromptError';

      const result = handleInteractiveError(exitError, mockLogger);

      expect(result.exitCode).toBe(130);
    });

    it('ExitPromptErrorの場合、「Operation cancelled」メッセージを表示する', () => {
      const exitError = new Error('User force closed the prompt');
      exitError.name = 'ExitPromptError';

      handleInteractiveError(exitError, mockLogger);

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('Operation cancelled')
      );
    });

    it('ExitPromptErrorの場合、ロガーに情報を記録する', () => {
      const exitError = new Error('User force closed the prompt');
      exitError.name = 'ExitPromptError';

      handleInteractiveError(exitError, mockLogger);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'User cancelled interactive mode',
        expect.any(Object)
      );
    });

    it('ExitPromptErrorの場合、shouldExitがtrueである', () => {
      const exitError = new Error('User force closed the prompt');
      exitError.name = 'ExitPromptError';

      const result = handleInteractiveError(exitError, mockLogger);

      expect(result.shouldExit).toBe(true);
    });
  });

  describe('確認プロンプトキャンセル（Error: Operation cancelled）の処理', () => {
    it('「Operation cancelled」エラーの場合、exitCode 0を返す', () => {
      const cancelError = new Error('Operation cancelled');

      const result = handleInteractiveError(cancelError, mockLogger);

      expect(result.exitCode).toBe(0);
    });

    it.skip('「Operation cancelled」エラーの場合、メッセージを表示する', () => {
      const cancelError = new Error('Operation cancelled');

      handleInteractiveError(cancelError, mockLogger);

      expect(mockConsoleLog).toHaveBeenCalledWith('Operation cancelled');
    });

    it('「Operation cancelled」エラーの場合、ロガーに情報を記録する', () => {
      const cancelError = new Error('Operation cancelled');

      handleInteractiveError(cancelError, mockLogger);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'User cancelled execution at confirmation',
        expect.any(Object)
      );
    });

    it('「Operation cancelled」エラーの場合、shouldExitがtrueである', () => {
      const cancelError = new Error('Operation cancelled');

      const result = handleInteractiveError(cancelError, mockLogger);

      expect(result.shouldExit).toBe(true);
    });
  });

  describe('その他のエラーの処理', () => {
    it('その他のエラーの場合、exitCode 1を返す', () => {
      const otherError = new Error('Some other error');

      const result = handleInteractiveError(otherError, mockLogger);

      expect(result.exitCode).toBe(1);
    });

    it.skip('その他のエラーの場合、エラーメッセージを表示する', () => {
      const otherError = new Error('Some other error');

      handleInteractiveError(otherError, mockLogger);

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('Error occurred')
      );
    });

    it.skip('その他のエラーの場合、ロガーにエラーを記録する', () => {
      const otherError = new Error('Some other error');

      handleInteractiveError(otherError, mockLogger);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Interactive mode error',
        expect.objectContaining({
          message: 'Some other error',
        })
      );
    });

    it('その他のエラーの場合、shouldExitがtrueである', () => {
      const otherError = new Error('Some other error');

      const result = handleInteractiveError(otherError, mockLogger);

      expect(result.shouldExit).toBe(true);
    });
  });

  describe('エラー型の判定', () => {
    it('ExitPromptErrorはnameプロパティで識別される', () => {
      const exitError = new Error('Test');
      exitError.name = 'ExitPromptError';

      const result = handleInteractiveError(exitError, mockLogger);

      expect(result.exitCode).toBe(130);
    });

    it('エラーメッセージ「Operation cancelled」で確認キャンセルが識別される', () => {
      const cancelError = new Error('Operation cancelled');

      const result = handleInteractiveError(cancelError, mockLogger);

      expect(result.exitCode).toBe(0);
    });

    it('nameもmessageも一致しない場合は一般エラーとして扱われる', () => {
      const genericError = new Error('Generic error');

      const result = handleInteractiveError(genericError, mockLogger);

      expect(result.exitCode).toBe(1);
    });
  });
});
