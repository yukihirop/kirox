/**
 * Interactive TTY Check Test
 *
 * Tests for non-TTY environment error handling
 * Task 5.3: 非TTY環境エラーハンドリングの実装
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { checkTTYEnvironment } from '@/cli/interactive-prompt.js';
import { PinoLogger } from '@/reporting/pino-logger.js';

// Mock console.error and console.log
const mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
const mockConsoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});

// PinoLogger is mocked globally in tests/setup.ts

describe('checkTTYEnvironment', () => {
  let mockLogger: PinoLogger;
  let originalIsTTY: boolean | undefined;

  beforeEach(() => {
    mockLogger = new PinoLogger(false);
    mockConsoleError.mockClear();
    mockConsoleLog.mockClear();
    vi.clearAllMocks();

    // Save original isTTY value
    originalIsTTY = process.stdin.isTTY;
  });

  afterEach(() => {
    vi.clearAllMocks();

    // Restore original isTTY value
    if (originalIsTTY !== undefined) {
      Object.defineProperty(process.stdin, 'isTTY', {
        value: originalIsTTY,
        writable: true,
        configurable: true,
      });
    }
  });

  describe('TTY環境の場合', () => {
    it('isTTYがtrueの場合、エラーなしで成功を返す', () => {
      // Mock isTTY as true
      Object.defineProperty(process.stdin, 'isTTY', {
        value: true,
        writable: true,
        configurable: true,
      });

      const result = checkTTYEnvironment(mockLogger);

      expect(result.success).toBe(true);
      expect(result.exitCode).toBe(0);
    });

    it('isTTYがtrueの場合、エラーメッセージを表示しない', () => {
      Object.defineProperty(process.stdin, 'isTTY', {
        value: true,
        writable: true,
        configurable: true,
      });

      checkTTYEnvironment(mockLogger);

      expect(mockConsoleError).not.toHaveBeenCalled();
    });

    it('isTTYがtrueの場合、ロガーにエラーを記録しない', () => {
      Object.defineProperty(process.stdin, 'isTTY', {
        value: true,
        writable: true,
        configurable: true,
      });

      checkTTYEnvironment(mockLogger);

      expect(mockLogger.error).not.toHaveBeenCalled();
    });
  });

  describe('非TTY環境の場合', () => {
    it('isTTYがfalseの場合、失敗を返す', () => {
      Object.defineProperty(process.stdin, 'isTTY', {
        value: false,
        writable: true,
        configurable: true,
      });

      const result = checkTTYEnvironment(mockLogger);

      expect(result.success).toBe(false);
    });

    it('isTTYがfalseの場合、exitCode 1を返す', () => {
      Object.defineProperty(process.stdin, 'isTTY', {
        value: false,
        writable: true,
        configurable: true,
      });

      const result = checkTTYEnvironment(mockLogger);

      expect(result.exitCode).toBe(1);
    });

    it('isTTYがfalseの場合、適切なエラーメッセージを表示する', () => {
      Object.defineProperty(process.stdin, 'isTTY', {
        value: false,
        writable: true,
        configurable: true,
      });

      checkTTYEnvironment(mockLogger);

      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringContaining('Interactive mode is only available in TTY environment')
      );
    });

    it('isTTYがfalseの場合、使用例を表示する', () => {
      Object.defineProperty(process.stdin, 'isTTY', {
        value: false,
        writable: true,
        configurable: true,
      });

      checkTTYEnvironment(mockLogger);

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('npx kirox')
      );
    });

    it('isTTYがfalseの場合、ロガーにエラーを記録する', () => {
      Object.defineProperty(process.stdin, 'isTTY', {
        value: false,
        writable: true,
        configurable: true,
      });

      checkTTYEnvironment(mockLogger);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Interactive mode requires TTY environment',
        expect.objectContaining({
          isTTY: false,
        })
      );
    });
  });

  describe('isTTYがundefinedの場合', () => {
    it('undefinedの場合、非TTY環境として扱う', () => {
      Object.defineProperty(process.stdin, 'isTTY', {
        value: undefined,
        writable: true,
        configurable: true,
      });

      const result = checkTTYEnvironment(mockLogger);

      expect(result.success).toBe(false);
      expect(result.exitCode).toBe(1);
    });

    it('undefinedの場合、エラーメッセージを表示する', () => {
      Object.defineProperty(process.stdin, 'isTTY', {
        value: undefined,
        writable: true,
        configurable: true,
      });

      checkTTYEnvironment(mockLogger);

      expect(mockConsoleError).toHaveBeenCalled();
    });
  });

  describe('エラーメッセージの内容', () => {
    it('エラーメッセージに「Please specify arguments explicitly」が含まれる', () => {
      Object.defineProperty(process.stdin, 'isTTY', {
        value: false,
        writable: true,
        configurable: true,
      });

      checkTTYEnvironment(mockLogger);

      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringContaining('Please specify arguments explicitly')
      );
    });

    it('使用例に「Usage:」が含まれる', () => {
      Object.defineProperty(process.stdin, 'isTTY', {
        value: false,
        writable: true,
        configurable: true,
      });

      checkTTYEnvironment(mockLogger);

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('Usage:')
      );
    });

    it('使用例に「owner/repo」が含まれる', () => {
      Object.defineProperty(process.stdin, 'isTTY', {
        value: false,
        writable: true,
        configurable: true,
      });

      checkTTYEnvironment(mockLogger);

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('owner/repo')
      );
    });

    it('使用例に「-p project-name」が含まれる', () => {
      Object.defineProperty(process.stdin, 'isTTY', {
        value: false,
        writable: true,
        configurable: true,
      });

      checkTTYEnvironment(mockLogger);

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('-p')
      );
    });
  });
});
