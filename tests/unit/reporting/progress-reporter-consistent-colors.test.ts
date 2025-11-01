/**
 * ProgressReporter - Consistent Colors (Task 14.8)
 *
 * Tests to ensure all success/error messages have consistent colors,
 * regardless of whether they're the first file or subsequent files.
 *
 * Bug: First file shows white ✔ (ora.succeed()), subsequent files show green ✓ (console.log)
 * Fix: Use stop() + console.log() consistently for all files
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

  spinner.start.mockImplementation((message?: string) => {
    spinner.isSpinning = true;
    if (message !== undefined) {
      spinner.text = message;
    }
    return spinner;
  });

  spinner.stop.mockImplementation(() => {
    spinner.isSpinning = false;
    return spinner;
  });

  spinner.succeed.mockImplementation((message?: string) => {
    spinner.isSpinning = false;
    if (message) {
      spinner.text = message;
    }
    return spinner;
  });

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

describe('ProgressReporter - Consistent Colors (Task 14.8)', () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('reportSuccess should use consistent colors', () => {
    it('should use console.log with chalk.green for first file after pauseSpinner', async () => {
      const { ProgressReporter } = await import(
        '../../../src/reporting/progress-reporter.js'
      );
      const reporter = new ProgressReporter({ verbose: false, useColor: true });

      // Simulate file fetching with pause/resume cycle
      reporter.reportProgress(1, 10, 'file1.md');
      reporter.pauseSpinner();

      const reporterAny = reporter as unknown as {
        spinnerMap: Map<string, Ora>;
      };

      const spinner = reporterAny.spinnerMap.get('');
      expect(spinner).toBeDefined();

      // Call reportSuccess - should use console.log, NOT succeed()
      reporter.reportSuccess('Saved: file1.md');

      // Task 14.8: Should NOT call spinner.succeed()
      expect(spinner!.succeed).not.toHaveBeenCalled();

      // Task 14.8: Should call console.log with green color
      expect(consoleLogSpy).toHaveBeenCalled();
      const logCall = consoleLogSpy.mock.calls[0]?.[0];
      expect(logCall).toContain('✓ Saved: file1.md');
      // Chalk.green() applies ANSI escape codes for green color
      expect(logCall).toMatch(/\u001b\[32m/); // ANSI green color code
    });

    it('should use same console.log approach for subsequent files', async () => {
      const { ProgressReporter } = await import(
        '../../../src/reporting/progress-reporter.js'
      );
      const reporter = new ProgressReporter({ verbose: false, useColor: true });

      // First file
      reporter.reportProgress(1, 10, 'file1.md');
      reporter.pauseSpinner();
      reporter.reportSuccess('Saved: file1.md');

      const firstLogCall = consoleLogSpy.mock.calls[0]?.[0];

      // Second file
      reporter.reportProgress(2, 10, 'file2.md');
      reporter.pauseSpinner();
      reporter.reportSuccess('Saved: file2.md');

      const secondLogCall = consoleLogSpy.mock.calls[1]?.[0];

      // Both should have same format and color
      expect(firstLogCall).toMatch(/\u001b\[32m.*✓ Saved: file1.md/);
      expect(secondLogCall).toMatch(/\u001b\[32m.*✓ Saved: file2.md/);
    });

    it('should work correctly in multi-project mode with consistent colors', async () => {
      const { ProgressReporter } = await import(
        '../../../src/reporting/progress-reporter.js'
      );
      const reporter = new ProgressReporter({ verbose: false, useColor: true });

      // Project 1 - First file
      reporter.reportProgress(1, 8, 'file1.md', 'proj1');
      reporter.pauseSpinner('proj1');
      reporter.reportSuccess('Saved: file1.md', 'proj1');

      // Project 1 - Second file
      reporter.reportProgress(2, 8, 'file2.md', 'proj1');
      reporter.pauseSpinner('proj1');
      reporter.reportSuccess('Saved: file2.md', 'proj1');

      // Project 2 - First file
      reporter.reportProgress(1, 4, 'file3.md', 'proj2');
      reporter.pauseSpinner('proj2');
      reporter.reportSuccess('Saved: file3.md', 'proj2');

      // All should use console.log with green color
      expect(consoleLogSpy).toHaveBeenCalledTimes(3);
      consoleLogSpy.mock.calls.forEach((call) => {
        expect(call[0]).toMatch(/\u001b\[32m.*✓ Saved:/);
      });
    });

    it('should stop spinner before calling console.log', async () => {
      const { ProgressReporter } = await import(
        '../../../src/reporting/progress-reporter.js'
      );
      const reporter = new ProgressReporter({ verbose: false, useColor: true });

      reporter.reportProgress(1, 10, 'file.md');
      reporter.pauseSpinner();

      const reporterAny = reporter as unknown as {
        spinnerMap: Map<string, Ora>;
      };

      const spinner = reporterAny.spinnerMap.get('');

      reporter.reportSuccess('Saved: file.md');

      // Spinner should be stopped (already paused)
      expect(spinner!.stop).toHaveBeenCalled();
      expect(spinner!.isSpinning).toBe(false);

      // Console.log should be called after stop
      expect(consoleLogSpy).toHaveBeenCalled();
    });
  });

  describe('reportError should use consistent colors', () => {
    let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    });

    it('should use console.error with chalk.red consistently', async () => {
      const { ProgressReporter } = await import(
        '../../../src/reporting/progress-reporter.js'
      );
      const reporter = new ProgressReporter({ verbose: false, useColor: true });

      // First file error
      reporter.reportProgress(1, 10, 'file1.md');
      reporter.pauseSpinner();

      const reporterAny = reporter as unknown as {
        spinnerMap: Map<string, Ora>;
      };

      const spinner = reporterAny.spinnerMap.get('');

      reporter.reportError('Failed: file1.md - Network error');

      // Task 14.8: Should NOT call spinner.fail()
      expect(spinner!.fail).not.toHaveBeenCalled();

      // Task 14.8: Should call console.error with red color
      expect(consoleErrorSpy).toHaveBeenCalled();
      const errorCall = consoleErrorSpy.mock.calls[0]?.[0];
      expect(errorCall).toContain('✗ Failed: file1.md - Network error');
      // Chalk.red() applies ANSI escape codes for red color
      expect(errorCall).toMatch(/\u001b\[31m/); // ANSI red color code
    });

    it('should use same console.error approach for all error messages', async () => {
      const { ProgressReporter } = await import(
        '../../../src/reporting/progress-reporter.js'
      );
      const reporter = new ProgressReporter({ verbose: false, useColor: true });

      // Multiple errors
      reporter.reportProgress(1, 10, 'file1.md');
      reporter.pauseSpinner();
      reporter.reportError('Failed: file1.md');

      reporter.reportProgress(2, 10, 'file2.md');
      reporter.pauseSpinner();
      reporter.reportError('Failed: file2.md');

      // Both should have same format and color
      expect(consoleErrorSpy).toHaveBeenCalledTimes(2);
      consoleErrorSpy.mock.calls.forEach((call) => {
        expect(call[0]).toMatch(/\u001b\[31m.*✗ Failed:/);
      });
    });
  });
});
