/**
 * Unit tests for Progress Reporter
 */

import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import { ProgressReporter } from '@/reporting/progress-reporter';
import type { ReporterOptions } from '@/reporting/types';

describe('ProgressReporter', () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let originalForceColor: string | undefined;

  beforeAll(() => {
    // Force chalk to use colors in test environment
    originalForceColor = process.env.FORCE_COLOR;
    process.env.FORCE_COLOR = '1';
  });

  afterAll(() => {
    // Restore original environment
    if (originalForceColor === undefined) {
      delete process.env.FORCE_COLOR;
    } else {
      process.env.FORCE_COLOR = originalForceColor;
    }
  });

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('reportStart', () => {
    it('should display repository and project information', () => {
      const options: ReporterOptions = { verbose: false, useColor: true };
      const reporter = new ProgressReporter(options);

      reporter.reportStart('owner/repo', 'my-project');

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('owner/repo')
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('my-project')
      );
    });

    it('should use colored output when useColor is true', () => {
      const options: ReporterOptions = { verbose: false, useColor: true };
      const reporter = new ProgressReporter(options);

      reporter.reportStart('owner/repo', 'my-project');

      // Chalk adds ANSI color codes (e.g., \x1b[36m for cyan)
      const calls = consoleLogSpy.mock.calls.flat();
      const hasColorCodes = calls.some((arg) =>
        String(arg).includes('\x1b[')
      );

      expect(hasColorCodes).toBe(true);
    });

    it('should not use color codes when useColor is false', () => {
      const options: ReporterOptions = { verbose: false, useColor: false };
      const reporter = new ProgressReporter(options);

      reporter.reportStart('owner/repo', 'my-project');

      const calls = consoleLogSpy.mock.calls.flat();
      const hasColorCodes = calls.some((arg) =>
        String(arg).includes('\x1b[')
      );

      expect(hasColorCodes).toBe(false);
    });
  });

  describe('reportProgress', () => {
    it('should display progress in [n/total] filename format', () => {
      const options: ReporterOptions = { verbose: false, useColor: true };
      const reporter = new ProgressReporter(options);

      reporter.reportProgress(3, 10, 'example.md');

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringMatching(/\[3\/10\].*example\.md/)
      );
    });

    it('should show different messages for different progress states', () => {
      const options: ReporterOptions = { verbose: false, useColor: true };
      const reporter = new ProgressReporter(options);

      reporter.reportProgress(1, 5, 'file1.md');
      reporter.reportProgress(5, 5, 'file5.md');

      expect(consoleLogSpy).toHaveBeenCalledTimes(2);
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('[1/5]')
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('[5/5]')
      );
    });

    it('should use cyan color for progress messages when useColor is true', () => {
      const options: ReporterOptions = { verbose: false, useColor: true };
      const reporter = new ProgressReporter(options);

      reporter.reportProgress(1, 5, 'test.md');

      const calls = consoleLogSpy.mock.calls.flat();
      const hasColorCodes = calls.some((arg) =>
        String(arg).includes('\x1b[')
      );

      expect(hasColorCodes).toBe(true);
    });
  });

  describe('reportSuccess', () => {
    it('should display success message in green', () => {
      const options: ReporterOptions = { verbose: false, useColor: true };
      const reporter = new ProgressReporter(options);

      reporter.reportSuccess('File downloaded successfully');

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('successfully')
      );

      // Check for green color code (\x1b[32m)
      const calls = consoleLogSpy.mock.calls.flat();
      const hasGreenCode = calls.some((arg) =>
        String(arg).includes('\x1b[32m')
      );

      expect(hasGreenCode).toBe(true);
    });

    it('should not use color when useColor is false', () => {
      const options: ReporterOptions = { verbose: false, useColor: false };
      const reporter = new ProgressReporter(options);

      reporter.reportSuccess('Success message');

      const calls = consoleLogSpy.mock.calls.flat();
      const hasColorCodes = calls.some((arg) =>
        String(arg).includes('\x1b[')
      );

      expect(hasColorCodes).toBe(false);
    });
  });

  describe('reportError', () => {
    it('should display error message in red', () => {
      const options: ReporterOptions = { verbose: false, useColor: true };
      const reporter = new ProgressReporter(options);

      reporter.reportError('An error occurred');

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('error')
      );

      // Check for red color code (\x1b[31m)
      const calls = consoleErrorSpy.mock.calls.flat();
      const hasRedCode = calls.some((arg) =>
        String(arg).includes('\x1b[31m')
      );

      expect(hasRedCode).toBe(true);
    });

    it('should not use color when useColor is false', () => {
      const options: ReporterOptions = { verbose: false, useColor: false };
      const reporter = new ProgressReporter(options);

      reporter.reportError('Error message');

      const calls = consoleErrorSpy.mock.calls.flat();
      const hasColorCodes = calls.some((arg) =>
        String(arg).includes('\x1b[')
      );

      expect(hasColorCodes).toBe(false);
    });
  });

  describe('reportSummary', () => {
    it('should display summary with success and failed counts', () => {
      const options: ReporterOptions = { verbose: false, useColor: true };
      const reporter = new ProgressReporter(options);

      reporter.reportSummary(8, 2);

      // Check all console.log calls
      const allCalls = consoleLogSpy.mock.calls.map((call) => call[0]);
      const hasSuccessMessage = allCalls.some((msg) => /8.*succeeded/i.test(String(msg)));
      const hasFailedMessage = allCalls.some((msg) => /2.*failed/i.test(String(msg)));

      expect(hasSuccessMessage).toBe(true);
      expect(hasFailedMessage).toBe(true);
    });

    it('should show all success message when no failures', () => {
      const options: ReporterOptions = { verbose: false, useColor: true };
      const reporter = new ProgressReporter(options);

      reporter.reportSummary(10, 0);

      // Check all console.log calls
      const allCalls = consoleLogSpy.mock.calls.map((call) => call[0]);
      const hasSuccessMessage = allCalls.some((msg) => /10.*succeeded/i.test(String(msg)));
      const hasFailedMessage = allCalls.some((msg) => /0.*failed/i.test(String(msg)));

      expect(hasSuccessMessage).toBe(true);
      expect(hasFailedMessage).toBe(true);
    });

    it('should use green for success count and red for failed count', () => {
      const options: ReporterOptions = { verbose: false, useColor: true };
      const reporter = new ProgressReporter(options);

      reporter.reportSummary(5, 3);

      const calls = consoleLogSpy.mock.calls.flat();
      const hasGreenCode = calls.some((arg) =>
        String(arg).includes('\x1b[32m')
      );
      const hasRedCode = calls.some((arg) =>
        String(arg).includes('\x1b[31m')
      );

      expect(hasGreenCode).toBe(true);
      expect(hasRedCode).toBe(true);
    });
  });

  describe('reportVerbose', () => {
    it('should not display verbose message when verbose is false', () => {
      const options: ReporterOptions = { verbose: false, useColor: true };
      const reporter = new ProgressReporter(options);

      reporter.reportVerbose('Detailed debug information');

      expect(consoleLogSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('debug')
      );
    });

    it('should display verbose message when verbose is true', () => {
      const options: ReporterOptions = { verbose: true, useColor: true };
      const reporter = new ProgressReporter(options);

      reporter.reportVerbose('Detailed debug information');

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('debug')
      );
    });

    it('should use gray color for verbose messages', () => {
      const options: ReporterOptions = { verbose: true, useColor: true };
      const reporter = new ProgressReporter(options);

      reporter.reportVerbose('Debug info');

      const calls = consoleLogSpy.mock.calls.flat();
      const hasGrayCode = calls.some((arg) =>
        String(arg).includes('\x1b[90m')
      );

      expect(hasGrayCode).toBe(true);
    });
  });
});
