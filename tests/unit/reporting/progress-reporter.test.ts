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

    it('should display subdirectory path when provided', () => {
      const options: ReporterOptions = { verbose: false, useColor: true };
      const reporter = new ProgressReporter(options);

      reporter.reportStart('owner/repo', 'my-project', 'packages/api');

      const allCalls = consoleLogSpy.mock.calls.map((call) => call[0]);
      const hasSubdirPath = allCalls.some((msg) =>
        String(msg).includes('packages/api/.kiro')
      );

      expect(hasSubdirPath).toBe(true);
    });

    it('should display root path when subdirectory is not provided', () => {
      const options: ReporterOptions = { verbose: false, useColor: true };
      const reporter = new ProgressReporter(options);

      reporter.reportStart('owner/repo', 'my-project');

      const allCalls = consoleLogSpy.mock.calls.map((call) => call[0]);
      const hasRootPath = allCalls.some((msg) =>
        String(msg).includes('owner/repo/.kiro') && !String(msg).includes('owner/repo/packages')
      );

      expect(hasRootPath).toBe(true);
    });

    it('should display root path when subdirectory is empty string', () => {
      const options: ReporterOptions = { verbose: false, useColor: true };
      const reporter = new ProgressReporter(options);

      reporter.reportStart('owner/repo', 'my-project', '');

      const allCalls = consoleLogSpy.mock.calls.map((call) => call[0]);
      const hasRootPath = allCalls.some((msg) =>
        String(msg).includes('owner/repo/.kiro')
      );

      expect(hasRootPath).toBe(true);
    });

    it('should display branch information when branch is specified', () => {
      const options: ReporterOptions = { verbose: false, useColor: true };
      const reporter = new ProgressReporter(options);

      reporter.reportStart('owner/repo', 'my-project', undefined, 'feature-branch');

      const allCalls = consoleLogSpy.mock.calls.map((call) => call[0]);
      const hasBranchInfo = allCalls.some((msg) =>
        String(msg).includes('ブランチ: feature-branch')
      );

      expect(hasBranchInfo).toBe(true);
    });

    it('should display default branch information when branch is not specified', () => {
      const options: ReporterOptions = { verbose: false, useColor: true };
      const reporter = new ProgressReporter(options);

      reporter.reportStart('owner/repo', 'my-project', undefined, undefined);

      const allCalls = consoleLogSpy.mock.calls.map((call) => call[0]);
      const hasDefaultBranchInfo = allCalls.some((msg) =>
        String(msg).includes('デフォルトブランチ')
      );

      expect(hasDefaultBranchInfo).toBe(true);
    });

    it('should display branch information with subdirectory', () => {
      const options: ReporterOptions = { verbose: false, useColor: true };
      const reporter = new ProgressReporter(options);

      reporter.reportStart('owner/repo', 'my-project', 'packages/api', 'develop');

      const allCalls = consoleLogSpy.mock.calls.map((call) => call[0]);
      const hasSubdirPath = allCalls.some((msg) =>
        String(msg).includes('packages/api/.kiro')
      );
      const hasBranchInfo = allCalls.some((msg) =>
        String(msg).includes('ブランチ: develop')
      );

      expect(hasSubdirPath).toBe(true);
      expect(hasBranchInfo).toBe(true);
    });

    it('should not display branch info when branch is empty string', () => {
      const options: ReporterOptions = { verbose: false, useColor: true };
      const reporter = new ProgressReporter(options);

      reporter.reportStart('owner/repo', 'my-project', undefined, '');

      const allCalls = consoleLogSpy.mock.calls.map((call) => call[0]);
      const hasDefaultBranchInfo = allCalls.some((msg) =>
        String(msg).includes('デフォルトブランチ')
      );

      expect(hasDefaultBranchInfo).toBe(true);
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

    it('should display subdirectory path when provided', () => {
      const options: ReporterOptions = { verbose: false, useColor: true };
      const reporter = new ProgressReporter(options);

      reporter.reportSummary(8, 2, 'packages/api');

      const allCalls = consoleLogSpy.mock.calls.map((call) => call[0]);
      const hasSubdirPath = allCalls.some((msg) =>
        String(msg).includes('packages/api')
      );

      expect(hasSubdirPath).toBe(true);
    });

    it('should not display subdirectory path when not provided', () => {
      const options: ReporterOptions = { verbose: false, useColor: true };
      const reporter = new ProgressReporter(options);

      reporter.reportSummary(8, 2);

      const allCalls = consoleLogSpy.mock.calls.map((call) => call[0]);
      const hasSubdirMention = allCalls.some((msg) =>
        /from|subdirectory/i.test(String(msg))
      );

      expect(hasSubdirMention).toBe(false);
    });

    it('should not display subdirectory path when empty string', () => {
      const options: ReporterOptions = { verbose: false, useColor: true };
      const reporter = new ProgressReporter(options);

      reporter.reportSummary(8, 2, '');

      const allCalls = consoleLogSpy.mock.calls.map((call) => call[0]);
      const hasSubdirMention = allCalls.some((msg) =>
        /from|subdirectory/i.test(String(msg))
      );

      expect(hasSubdirMention).toBe(false);
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

  describe('reportDryRunFileList', () => {
    it('should display list of files to be fetched in dry-run mode', () => {
      const options: ReporterOptions = { verbose: false, useColor: true };
      const reporter = new ProgressReporter(options);

      const files = ['file1.md', 'file2.md', 'file3.md'];
      reporter.reportDryRunFileList(files);

      // Check that all files are displayed
      const allCalls = consoleLogSpy.mock.calls.map((call) => call[0]);
      const hasFile1 = allCalls.some((msg) => String(msg).includes('file1.md'));
      const hasFile2 = allCalls.some((msg) => String(msg).includes('file2.md'));
      const hasFile3 = allCalls.some((msg) => String(msg).includes('file3.md'));

      expect(hasFile1).toBe(true);
      expect(hasFile2).toBe(true);
      expect(hasFile3).toBe(true);
    });

    it('should display dry-run header message', () => {
      const options: ReporterOptions = { verbose: false, useColor: true };
      const reporter = new ProgressReporter(options);

      const files = ['test.md'];
      reporter.reportDryRunFileList(files);

      const allCalls = consoleLogSpy.mock.calls.map((call) => call[0]);
      const hasDryRunMessage = allCalls.some((msg) =>
        /dry.*run/i.test(String(msg))
      );

      expect(hasDryRunMessage).toBe(true);
    });

    it('should display file count in dry-run mode', () => {
      const options: ReporterOptions = { verbose: false, useColor: true };
      const reporter = new ProgressReporter(options);

      const files = ['file1.md', 'file2.md', 'file3.md'];
      reporter.reportDryRunFileList(files);

      const allCalls = consoleLogSpy.mock.calls.map((call) => call[0]);
      const hasCount = allCalls.some((msg) => /3.*file/i.test(String(msg)));

      expect(hasCount).toBe(true);
    });

    it('should use cyan color for dry-run messages when useColor is true', () => {
      const options: ReporterOptions = { verbose: false, useColor: true };
      const reporter = new ProgressReporter(options);

      const files = ['test.md'];
      reporter.reportDryRunFileList(files);

      const calls = consoleLogSpy.mock.calls.flat();
      const hasCyanCode = calls.some((arg) =>
        String(arg).includes('\x1b[36m')
      );

      expect(hasCyanCode).toBe(true);
    });

    it('should not use color codes when useColor is false', () => {
      const options: ReporterOptions = { verbose: false, useColor: false };
      const reporter = new ProgressReporter(options);

      const files = ['test.md'];
      reporter.reportDryRunFileList(files);

      const calls = consoleLogSpy.mock.calls.flat();
      const hasColorCodes = calls.some((arg) =>
        String(arg).includes('\x1b[')
      );

      expect(hasColorCodes).toBe(false);
    });

    it('should handle empty file list', () => {
      const options: ReporterOptions = { verbose: false, useColor: true };
      const reporter = new ProgressReporter(options);

      const files: string[] = [];
      reporter.reportDryRunFileList(files);

      const allCalls = consoleLogSpy.mock.calls.map((call) => call[0]);
      const hasNoFilesMessage = allCalls.some((msg) =>
        /0.*file|no.*file/i.test(String(msg))
      );

      expect(hasNoFilesMessage).toBe(true);
    });
  });
});
