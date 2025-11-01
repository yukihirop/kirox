/**
 * ProgressReporter - Double Checkmark Bug Fix (Task 14.6)
 *
 * Tests to prevent double checkmarks in success/error messages when using ora spinner.
 *
 * Bug: When reportSuccess() creates formattedMessage = "✓ Saved: file.md"
 * and passes it to spinner.succeed(), ora adds its own "✔" prefix,
 * resulting in "✔ ✓ Saved: file.md" (double checkmark).
 *
 * Fix: Pass message without manual checkmark to spinner.succeed()/fail(),
 * and let ora add its own checkmark automatically.
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

describe('ProgressReporter - Double Checkmark Fix (Task 14.6)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('reportSuccess should not add manual checkmark when using spinner', () => {
    it('should pass message WITHOUT ✓ prefix to spinner.succeed()', async () => {
      const { ProgressReporter } = await import(
        '../../../src/reporting/progress-reporter.js'
      );
      const reporter = new ProgressReporter({ verbose: false, useColor: true });

      // Start spinner
      reporter.reportProgress(1, 10, 'file.md');

      const reporterAny = reporter as unknown as {
        spinnerMap: Map<string, Ora>;
      };

      const spinner = reporterAny.spinnerMap.get('');
      expect(spinner).toBeDefined();
      expect(spinner!.isSpinning).toBe(true);

      // Call reportSuccess
      reporter.reportSuccess('Saved: file.md');

      // Verify spinner.succeed was called WITHOUT ✓ prefix
      // ora will add its own ✔ prefix, so we should NOT add ✓ manually
      expect(spinner!.succeed).toHaveBeenCalledTimes(1);
      expect(spinner!.succeed).toHaveBeenCalledWith('Saved: file.md');

      // Should NOT be called with "✓ Saved: file.md"
      expect(spinner!.succeed).not.toHaveBeenCalledWith('✓ Saved: file.md');
    });

    it('should pass message WITHOUT ✓ prefix for multi-project mode', async () => {
      const { ProgressReporter } = await import(
        '../../../src/reporting/progress-reporter.js'
      );
      const reporter = new ProgressReporter({ verbose: false, useColor: true });

      // Start spinner for project
      reporter.reportProgress(1, 10, 'file.md', 'proj1');

      const reporterAny = reporter as unknown as {
        spinnerMap: Map<string, Ora>;
      };

      const spinner = reporterAny.spinnerMap.get('proj1');
      expect(spinner).toBeDefined();
      expect(spinner!.isSpinning).toBe(true);

      // Call reportSuccess with project name
      reporter.reportSuccess('Saved: file.md', 'proj1');

      // Verify spinner.succeed was called WITHOUT ✓ prefix
      expect(spinner!.succeed).toHaveBeenCalledWith('Saved: file.md');
      expect(spinner!.succeed).not.toHaveBeenCalledWith('✓ Saved: file.md');
    });
  });

  describe('reportError should not add manual cross mark when using spinner', () => {
    it('should pass message WITHOUT ✗ prefix to spinner.fail()', async () => {
      const { ProgressReporter } = await import(
        '../../../src/reporting/progress-reporter.js'
      );
      const reporter = new ProgressReporter({ verbose: false, useColor: true });

      // Start spinner
      reporter.reportProgress(1, 10, 'file.md');

      const reporterAny = reporter as unknown as {
        spinnerMap: Map<string, Ora>;
      };

      const spinner = reporterAny.spinnerMap.get('');
      expect(spinner).toBeDefined();

      // Call reportError
      reporter.reportError('Failed: file.md - Network error');

      // Verify spinner.fail was called WITHOUT ✗ prefix
      // ora will add its own ✖ prefix, so we should NOT add ✗ manually
      expect(spinner!.fail).toHaveBeenCalledTimes(1);
      expect(spinner!.fail).toHaveBeenCalledWith('Failed: file.md - Network error');

      // Should NOT be called with "✗ Failed: ..."
      expect(spinner!.fail).not.toHaveBeenCalledWith('✗ Failed: file.md - Network error');
    });

    it('should pass message WITHOUT ✗ prefix for multi-project mode', async () => {
      const { ProgressReporter } = await import(
        '../../../src/reporting/progress-reporter.js'
      );
      const reporter = new ProgressReporter({ verbose: false, useColor: true });

      // Start spinner for project
      reporter.reportProgress(1, 10, 'file.md', 'proj1');

      const reporterAny = reporter as unknown as {
        spinnerMap: Map<string, Ora>;
      };

      const spinner = reporterAny.spinnerMap.get('proj1');
      expect(spinner).toBeDefined();

      // Call reportError with project name
      reporter.reportError('Failed: file.md - Error', 'proj1');

      // Verify spinner.fail was called WITHOUT ✗ prefix
      expect(spinner!.fail).toHaveBeenCalledWith('Failed: file.md - Error');
      expect(spinner!.fail).not.toHaveBeenCalledWith('✗ Failed: file.md - Error');
    });
  });

  describe('Fallback mode should still include checkmarks', () => {
    it('should include ✓ prefix when using console.log fallback (no spinner)', async () => {
      // This test verifies that when spinner is NOT used (fallback mode),
      // the checkmark should still be included in console.log output

      const { ProgressReporter } = await import(
        '../../../src/reporting/progress-reporter.js'
      );

      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

      const reporter = new ProgressReporter({ verbose: false, useColor: true });

      // Force fallback mode by calling reportSuccess without starting spinner
      // (no active spinner in map)
      reporter.reportSuccess('Saved: file.md');

      // In fallback mode, console.log should include ✓ prefix
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('✓ Saved: file.md'));

      consoleLogSpy.mockRestore();
    });

    it('should include ✗ prefix when using console.error fallback', async () => {
      const { ProgressReporter } = await import(
        '../../../src/reporting/progress-reporter.js'
      );

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

      const reporter = new ProgressReporter({ verbose: false, useColor: true });

      // Force fallback by calling reportError without spinner
      reporter.reportError('Failed: file.md');

      // In fallback mode, console.error should include ✗ prefix
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('✗ Failed: file.md'));

      consoleErrorSpy.mockRestore();
    });
  });
});
