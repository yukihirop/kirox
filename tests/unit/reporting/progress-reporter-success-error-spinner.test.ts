/**
 * ProgressReporter Success/Error with Spinner Tests
 *
 * Tests for Task 4.1 & 4.2: reportSuccess と reportError メソッドをスピナー統合
 *
 * Task 4.1: reportSuccess メソッドをoraのsucceedに置き換え
 * - フォールバックモードでない場合、現在のスピナーを .succeed() で停止
 * - 成功メッセージを引数としてsucceedメソッドに渡す
 * - フォールバックモード時は既存のconsole.log実装を使用
 *
 * Task 4.2: reportError メソッドをoraのfailに置き換え
 * - フォールバックモードでない場合、現在のスピナーを .fail() で停止
 * - エラーメッセージを引数としてfailメソッドに渡す
 * - フォールバックモード時は既存のconsole.error実装を使用
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { Ora } from 'ora';

// Mock ora module
function createMockSpinner() {
  const spinner = {
    text: '',
    isSpinning: false,
    color: 'cyan',
    start: vi.fn(),
    stop: vi.fn(),
    succeed: vi.fn(),
    fail: vi.fn(),
  };

  // Make start() set isSpinning to true and return this
  spinner.start.mockImplementation(() => {
    spinner.isSpinning = true;
    return spinner;
  });

  // Make stop() set isSpinning to false and return this
  spinner.stop.mockImplementation(() => {
    spinner.isSpinning = false;
    return spinner;
  });

  // Make succeed() set isSpinning to false and return this
  spinner.succeed.mockImplementation((message?: string) => {
    spinner.isSpinning = false;
    if (message) {
      spinner.text = message;
    }
    return spinner;
  });

  // Make fail() set isSpinning to false and return this
  spinner.fail.mockImplementation((message?: string) => {
    spinner.isSpinning = false;
    if (message) {
      spinner.text = message;
    }
    return spinner;
  });

  return spinner;
}

vi.mock('ora', () => ({
  default: vi.fn((options?: { text?: string; color?: string | false }) => {
    const spinner = createMockSpinner();
    if (options?.text) {
      spinner.text = options.text;
    }
    if (options?.color) {
      spinner.color = options.color as string;
    }
    return spinner;
  }),
}));

describe('ProgressReporter - reportSuccess/reportError with Spinner (Task 4.1 & 4.2)', () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Task 4.1: reportSuccess with spinner', () => {
    it('should stop spinner and use console.log when spinner exists', async () => {
      const { ProgressReporter } = await import(
        '../../../src/reporting/progress-reporter.js'
      );
      const reporter = new ProgressReporter({ verbose: false, useColor: true });

      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

      // Create a spinner by calling reportProgress
      reporter.reportProgress(1, 10, 'file.md');

      const reporterAny = reporter as unknown as {
        spinnerMap: Map<string, Ora>;
      };

      const spinner = reporterAny.spinnerMap.get('');
      expect(spinner).toBeDefined();

      // Call reportSuccess
      reporter.reportSuccess('File downloaded successfully');

      // Task 4.1: Should call spinner.succeed() with success message
      expect(spinner!.succeed).toHaveBeenCalled();
      expect(spinner!.succeed).toHaveBeenCalledWith('✓ File downloaded successfully');
      expect(consoleLogSpy).toHaveBeenCalled();
      expect(consoleLogSpy.mock.calls[0]?.[0]).toContain('✓ File downloaded successfully');

      consoleLogSpy.mockRestore();
    });

    it('should stop spinner when calling succeed()', async () => {
      const { ProgressReporter } = await import(
        '../../../src/reporting/progress-reporter.js'
      );
      const reporter = new ProgressReporter({ verbose: false, useColor: true });

      // Create a spinner
      reporter.reportProgress(1, 10, 'file.md');

      const reporterAny = reporter as unknown as {
        spinnerMap: Map<string, Ora>;
      };

      const spinner = reporterAny.spinnerMap.get('');
      expect(spinner!.isSpinning).toBe(true);

      // Call reportSuccess
      reporter.reportSuccess('Success message');

      // Spinner should be stopped
      expect(spinner!.isSpinning).toBe(false);
    });

    it('should use console.log in fallback mode', async () => {
      const { ProgressReporter } = await import(
        '../../../src/reporting/progress-reporter.js'
      );
      const reporter = new ProgressReporter({ verbose: false, useColor: true });

      // Force fallback mode
      (reporter as unknown as { useFallback: boolean }).useFallback = true;

      reporter.reportSuccess('Fallback success message');

      // Should have called console.log
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('✓ Fallback success message')
      );
    });

    it('should work with project-specific spinner', async () => {
      const { ProgressReporter } = await import(
        '../../../src/reporting/progress-reporter.js'
      );
      const reporter = new ProgressReporter({ verbose: false, useColor: true });

      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

      // Create project-specific spinner
      reporter.reportProgress(1, 8, 'file.md', 'proj1');

      const reporterAny = reporter as unknown as {
        spinnerMap: Map<string, Ora>;
      };

      const spinner = reporterAny.spinnerMap.get('proj1');
      expect(spinner).toBeDefined();

      // Call reportSuccess with project name
      reporter.reportSuccess('Project completed', 'proj1');

      // Task 4.1: Should call spinner.succeed() with success message
      expect(spinner!.succeed).toHaveBeenCalled();
      expect(spinner!.succeed).toHaveBeenCalledWith('✓ Project completed');
      expect(consoleLogSpy).toHaveBeenCalled();

      consoleLogSpy.mockRestore();
    });

    it('should strip subdirectory prefix from success messages', async () => {
      const { ProgressReporter } = await import(
        '../../../src/reporting/progress-reporter.js'
      );
      const reporter = new ProgressReporter({ verbose: false, useColor: true });

      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

      // Create spinner
      reporter.reportProgress(1, 10, 'file.md');

      // Call reportSuccess with subdirectory prefix
      reporter.reportSuccess('Saved: lib/a/.kiro/specs/project/file.md');

      // Should have stripped 'lib/a/' prefix
      expect(consoleLogSpy).toHaveBeenCalled();
      const logCall = consoleLogSpy.mock.calls[0]?.[0];
      expect(logCall).toContain('.kiro/specs/project/file.md');
      expect(logCall).not.toContain('lib/a/');

      consoleLogSpy.mockRestore();
    });
  });

  describe('Task 4.2: reportError with spinner', () => {
    it('should stop spinner and use console.error when spinner exists', async () => {
      const { ProgressReporter } = await import(
        '../../../src/reporting/progress-reporter.js'
      );
      const reporter = new ProgressReporter({ verbose: false, useColor: true });

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

      // Create a spinner by calling reportProgress
      reporter.reportProgress(1, 10, 'file.md');

      const reporterAny = reporter as unknown as {
        spinnerMap: Map<string, Ora>;
      };

      const spinner = reporterAny.spinnerMap.get('');
      expect(spinner).toBeDefined();

      // Call reportError
      reporter.reportError('Failed to fetch file');

      // Task 4.2: Should call spinner.fail() with error message
      expect(spinner!.fail).toHaveBeenCalled();
      expect(spinner!.fail).toHaveBeenCalledWith('✗ Failed to fetch file');
      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(consoleErrorSpy.mock.calls[0]?.[0]).toContain('✗ Failed to fetch file');

      consoleErrorSpy.mockRestore();
    });

    it('should stop spinner when calling fail()', async () => {
      const { ProgressReporter } = await import(
        '../../../src/reporting/progress-reporter.js'
      );
      const reporter = new ProgressReporter({ verbose: false, useColor: true });

      // Create a spinner
      reporter.reportProgress(1, 10, 'file.md');

      const reporterAny = reporter as unknown as {
        spinnerMap: Map<string, Ora>;
      };

      const spinner = reporterAny.spinnerMap.get('');
      expect(spinner!.isSpinning).toBe(true);

      // Call reportError
      reporter.reportError('Error message');

      // Spinner should be stopped
      expect(spinner!.isSpinning).toBe(false);
    });

    it('should use console.error in fallback mode', async () => {
      const { ProgressReporter } = await import(
        '../../../src/reporting/progress-reporter.js'
      );
      const reporter = new ProgressReporter({ verbose: false, useColor: true });

      // Force fallback mode
      (reporter as unknown as { useFallback: boolean }).useFallback = true;

      reporter.reportError('Fallback error message');

      // Should have called console.error
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('✗ Fallback error message')
      );
    });

    it('should work with project-specific spinner', async () => {
      const { ProgressReporter } = await import(
        '../../../src/reporting/progress-reporter.js'
      );
      const reporter = new ProgressReporter({ verbose: false, useColor: true });

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

      // Create project-specific spinner
      reporter.reportProgress(1, 8, 'file.md', 'proj1');

      const reporterAny = reporter as unknown as {
        spinnerMap: Map<string, Ora>;
      };

      const spinner = reporterAny.spinnerMap.get('proj1');
      expect(spinner).toBeDefined();

      // Call reportError with project name
      reporter.reportError('Project failed', 'proj1');

      // Task 4.2: Should call spinner.fail() with error message
      expect(spinner!.fail).toHaveBeenCalled();
      expect(spinner!.fail).toHaveBeenCalledWith('✗ Project failed');
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it('should handle error when no spinner exists', async () => {
      const { ProgressReporter } = await import(
        '../../../src/reporting/progress-reporter.js'
      );
      const reporter = new ProgressReporter({ verbose: false, useColor: true });

      // Call reportError without creating spinner first
      reporter.reportError('Error without spinner');

      // Should fall back to console.error (no crash)
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('✗ Error without spinner')
      );
    });
  });

  describe('Edge cases', () => {
    it('should handle reportSuccess and reportError with same spinner', async () => {
      const { ProgressReporter } = await import(
        '../../../src/reporting/progress-reporter.js'
      );
      const reporter = new ProgressReporter({ verbose: false, useColor: true });

      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

      // Create first spinner
      reporter.reportProgress(1, 10, 'file.md');

      const reporterAny = reporter as unknown as {
        spinnerMap: Map<string, Ora>;
      };

      const firstSpinner = reporterAny.spinnerMap.get('');

      // Call reportSuccess
      reporter.reportSuccess('First success');
      expect(firstSpinner!.succeed).toHaveBeenCalled();
      expect(firstSpinner!.succeed).toHaveBeenCalledWith('✓ First success');
      expect(consoleLogSpy).toHaveBeenCalled();

      // Create new spinner
      reporter.reportProgress(2, 10, 'file2.md');

      // Get the spinner instance (may be same or different depending on implementation)
      const secondSpinner = reporterAny.spinnerMap.get('');

      // Call reportError on spinner
      reporter.reportError('Second error');
      expect(secondSpinner!.fail).toHaveBeenCalled();
      expect(secondSpinner!.fail).toHaveBeenCalledWith('✗ Second error');
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleLogSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });

    it('should handle multiple projects with different outcomes', async () => {
      const { ProgressReporter } = await import(
        '../../../src/reporting/progress-reporter.js'
      );
      const reporter = new ProgressReporter({ verbose: false, useColor: true });

      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

      // Create spinners for two projects
      reporter.reportProgress(1, 5, 'file1.md', 'proj1');
      reporter.reportProgress(1, 5, 'file2.md', 'proj2');

      const reporterAny = reporter as unknown as {
        spinnerMap: Map<string, Ora>;
      };

      const spinner1 = reporterAny.spinnerMap.get('proj1');
      const spinner2 = reporterAny.spinnerMap.get('proj2');

      // One succeeds, one fails
      reporter.reportSuccess('Project 1 completed', 'proj1');
      reporter.reportError('Project 2 failed', 'proj2');

      expect(spinner1!.succeed).toHaveBeenCalled();
      expect(spinner1!.succeed).toHaveBeenCalledWith('✓ Project 1 completed');
      expect(spinner2!.fail).toHaveBeenCalled();
      expect(spinner2!.fail).toHaveBeenCalledWith('✗ Project 2 failed');
      expect(consoleLogSpy).toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleLogSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });
  });
});
