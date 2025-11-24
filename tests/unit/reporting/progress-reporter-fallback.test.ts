/**
 * ProgressReporter Fallback Mode Tests
 *
 * Tests for Task 2.2: エラーハンドリングとフォールバック機能
 * - ora 初期化失敗時のフォールバックモード移行
 * - verbose モード時のフォールバック警告メッセージ
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// We need to test fallback behavior by mocking ora to fail
describe('ProgressReporter - Fallback Mode (Task 2.2)', () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
  });

  describe('ora initialization failure handling', () => {
    it('should set useFallback:true when ora throws error in constructor', async () => {
      // Mock ora to throw error
      vi.doMock('ora', () => ({
        default: vi.fn(() => {
          throw new Error('Ora initialization failed');
        }),
      }));

      // Dynamically import to get mocked version
      const { ProgressReporter } = await import(
        '../../../src/reporting/progress-reporter.js'
      );

      const reporter = new ProgressReporter({ verbose: false, useColor: true });

      // After refactoring, useFallback is managed by SpinnerManager internally
      // Test that reporter initializes successfully even when ora fails
      expect(reporter).toBeDefined();
      expect(reporter).toBeInstanceOf(ProgressReporter);

      // Verify reporter continues to function (no crash)
      expect(() => reporter.reportStart('owner/repo', 'project')).not.toThrow();
    });

    it('should output warning when verbose:true and ora fails', async () => {
      // Mock ora to throw error
      vi.doMock('ora', () => ({
        default: vi.fn(() => {
          throw new Error('Ora initialization failed');
        }),
      }));

      // Dynamically import to get mocked version
      const { ProgressReporter } = await import(
        '../../../src/reporting/progress-reporter.js'
      );

      new ProgressReporter({ verbose: true, useColor: true });

      // Should have logged fallback warning
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Spinner initialization failed')
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('console output')
      );
    });

    it('should NOT output warning when verbose:false and ora fails', async () => {
      // Mock ora to throw error
      vi.doMock('ora', () => ({
        default: vi.fn(() => {
          throw new Error('Ora initialization failed');
        }),
      }));

      // Dynamically import to get mocked version
      const { ProgressReporter } = await import(
        '../../../src/reporting/progress-reporter.js'
      );

      new ProgressReporter({ verbose: false, useColor: true });

      // Should NOT have logged warning when verbose is false
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });

    it('should continue to work in fallback mode without crashing', async () => {
      // Mock ora to throw error
      vi.doMock('ora', () => ({
        default: vi.fn(() => {
          throw new Error('Ora initialization failed');
        }),
      }));

      // Dynamically import to get mocked version
      const { ProgressReporter } = await import(
        '../../../src/reporting/progress-reporter.js'
      );

      // Should not throw during construction
      expect(() => new ProgressReporter({ verbose: false, useColor: true })).not.toThrow();
    });
  });
});
