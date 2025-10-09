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

    it('should display branch information when branch is specified (task 5.5)', () => {
      const options: ReporterOptions = { verbose: false, useColor: true };
      const reporter = new ProgressReporter(options);

      reporter.reportStart('owner/repo', 'my-project', undefined, 'feature-branch');

      const allCalls = consoleLogSpy.mock.calls.map((call) => call[0]);
      const hasBranchInfo = allCalls.some((msg) =>
        String(msg).includes('branch: feature-branch')
      );

      expect(hasBranchInfo).toBe(true);
    });

    it('should display default branch information when branch is not specified (task 5.5)', () => {
      const options: ReporterOptions = { verbose: false, useColor: true };
      const reporter = new ProgressReporter(options);

      reporter.reportStart('owner/repo', 'my-project', undefined, undefined);

      const allCalls = consoleLogSpy.mock.calls.map((call) => call[0]);
      const hasDefaultBranchInfo = allCalls.some((msg) =>
        String(msg).includes('default branch')
      );

      expect(hasDefaultBranchInfo).toBe(true);
    });

    it('should display branch information with subdirectory (task 5.5)', () => {
      const options: ReporterOptions = { verbose: false, useColor: true };
      const reporter = new ProgressReporter(options);

      reporter.reportStart('owner/repo', 'my-project', 'packages/api', 'develop');

      const allCalls = consoleLogSpy.mock.calls.map((call) => call[0]);
      const hasSubdirPath = allCalls.some((msg) =>
        String(msg).includes('packages/api/.kiro')
      );
      const hasBranchInfo = allCalls.some((msg) =>
        String(msg).includes('branch: develop')
      );

      expect(hasSubdirPath).toBe(true);
      expect(hasBranchInfo).toBe(true);
    });

    it('should not display branch info when branch is empty string (task 5.5)', () => {
      const options: ReporterOptions = { verbose: false, useColor: true };
      const reporter = new ProgressReporter(options);

      reporter.reportStart('owner/repo', 'my-project', undefined, '');

      const allCalls = consoleLogSpy.mock.calls.map((call) => call[0]);
      const hasDefaultBranchInfo = allCalls.some((msg) =>
        String(msg).includes('default branch')
      );

      expect(hasDefaultBranchInfo).toBe(true);
    });

    // Task 8.1: Multi-project start display
    it('should display multi-project information when projects array is provided (task 8.1)', () => {
      const options: ReporterOptions = { verbose: false, useColor: true };
      const reporter = new ProgressReporter(options);

      reporter.reportStart('owner/repo', ['proj1', 'proj2', 'proj3']);

      const allCalls = consoleLogSpy.mock.calls.map((call) => call[0]);
      const hasMultiProjectInfo = allCalls.some((msg) =>
        String(msg).includes('3個のプロジェクト') ||
        (String(msg).includes('proj1') && String(msg).includes('proj2') && String(msg).includes('proj3'))
      );

      expect(hasMultiProjectInfo).toBe(true);
    });

    it('should display multi-project info with subdirectory (task 8.1)', () => {
      const options: ReporterOptions = { verbose: false, useColor: true };
      const reporter = new ProgressReporter(options);

      reporter.reportStart('owner/repo', ['proj1', 'proj2'], 'packages/api');

      const allCalls = consoleLogSpy.mock.calls.map((call) => call[0]);
      const hasSubdir = allCalls.some((msg) =>
        String(msg).includes('packages/api/.kiro')
      );
      const hasMultiProject = allCalls.some((msg) =>
        String(msg).includes('2個のプロジェクト')
      );

      expect(hasSubdir).toBe(true);
      expect(hasMultiProject).toBe(true);
    });

    it('should display multi-project info with branch (task 8.1)', () => {
      const options: ReporterOptions = { verbose: false, useColor: true };
      const reporter = new ProgressReporter(options);

      reporter.reportStart('owner/repo', ['proj1', 'proj2'], undefined, 'main');

      const allCalls = consoleLogSpy.mock.calls.map((call) => call[0]);
      const hasBranch = allCalls.some((msg) =>
        String(msg).includes('branch: main')
      );
      const hasMultiProject = allCalls.some((msg) =>
        String(msg).includes('2個のプロジェクト')
      );

      expect(hasBranch).toBe(true);
      expect(hasMultiProject).toBe(true);
    });

    it('should use single-project display when projects array has one element (task 8.1)', () => {
      const options: ReporterOptions = { verbose: false, useColor: true };
      const reporter = new ProgressReporter(options);

      reporter.reportStart('owner/repo', ['single-project']);

      const allCalls = consoleLogSpy.mock.calls.map((call) => call[0]);
      const hasSingleProjectDisplay = allCalls.some((msg) =>
        String(msg).includes('Project: single-project')
      );
      const hasMultiProjectDisplay = allCalls.some((msg) =>
        String(msg).includes('個のプロジェクト')
      );

      expect(hasSingleProjectDisplay).toBe(true);
      expect(hasMultiProjectDisplay).toBe(false);
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

    // Task 8.2: Project-specific progress display
    it('should display project name prefix when project provided (task 8.2)', () => {
      const options: ReporterOptions = { verbose: false, useColor: true };
      const reporter = new ProgressReporter(options);

      reporter.reportProgress(3, 10, 'example.md', 'proj1');

      const call = consoleLogSpy.mock.calls[0][0];
      expect(String(call)).toMatch(/\[proj1\].*\[3\/10\].*example\.md/);
    });

    it('should not display project prefix when project is undefined (task 8.2)', () => {
      const options: ReporterOptions = { verbose: false, useColor: true };
      const reporter = new ProgressReporter(options);

      reporter.reportProgress(3, 10, 'example.md', undefined);

      const call = consoleLogSpy.mock.calls[0][0];
      expect(String(call)).toMatch(/\[3\/10\].*example\.md/);
      expect(String(call)).not.toContain('[undefined]');
    });

    it('should handle empty project name (task 8.2)', () => {
      const options: ReporterOptions = { verbose: false, useColor: true };
      const reporter = new ProgressReporter(options);

      reporter.reportProgress(3, 10, 'example.md', '');

      const call = consoleLogSpy.mock.calls[0][0];
      expect(String(call)).toMatch(/\[3\/10\].*example\.md/);
      expect(String(call)).not.toMatch(/\[\]/);
    });

    it('should strip subdirectory prefix from file paths (bug fix task 5.4)', () => {
      const options: ReporterOptions = { verbose: false, useColor: true };
      const reporter = new ProgressReporter(options);

      // Remote path includes subdirectory: lib/a/.kiro/specs/project/requirements.md
      // Display should show: .kiro/specs/project/requirements.md (WITHOUT subdirectory prefix)
      reporter.reportProgress(1, 8, 'lib/a/.kiro/specs/project/requirements.md');

      const call = consoleLogSpy.mock.calls[0][0];
      expect(String(call)).toMatch(/\[1\/8\].*Fetching \.kiro\/specs\/project\/requirements\.md/);
      expect(String(call)).not.toContain('lib/a/.kiro');
    });

    it('should strip nested subdirectory prefix from file paths', () => {
      const options: ReporterOptions = { verbose: false, useColor: true };
      const reporter = new ProgressReporter(options);

      // Remote path with nested subdirectory: packages/api/v2/.kiro/steering/tech.md
      // Display should show: .kiro/steering/tech.md
      reporter.reportProgress(2, 5, 'packages/api/v2/.kiro/steering/tech.md');

      const call = consoleLogSpy.mock.calls[0][0];
      expect(String(call)).toMatch(/\[2\/5\].*Fetching \.kiro\/steering\/tech\.md/);
      expect(String(call)).not.toContain('packages/api/v2');
    });

    it('should handle file paths without subdirectory prefix', () => {
      const options: ReporterOptions = { verbose: false, useColor: true };
      const reporter = new ProgressReporter(options);

      // Remote path without subdirectory: .kiro/specs/project/tasks.md
      // Display should remain: .kiro/specs/project/tasks.md
      reporter.reportProgress(3, 10, '.kiro/specs/project/tasks.md');

      const call = consoleLogSpy.mock.calls[0][0];
      expect(String(call)).toMatch(/\[3\/10\].*Fetching \.kiro\/specs\/project\/tasks\.md/);
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

    it('should strip subdirectory prefix from success messages (bug fix task 5.4)', () => {
      const options: ReporterOptions = { verbose: false, useColor: true };
      const reporter = new ProgressReporter(options);

      reporter.reportSuccess('Saved: lib/a/.kiro/specs/project/requirements.md');

      const call = consoleLogSpy.mock.calls[0][0];
      expect(String(call)).toMatch(/✓ Saved: \.kiro\/specs\/project\/requirements\.md/);
      expect(String(call)).not.toContain('lib/a/.kiro');
    });

    it('should strip nested subdirectory prefix from success messages', () => {
      const options: ReporterOptions = { verbose: false, useColor: true };
      const reporter = new ProgressReporter(options);

      reporter.reportSuccess('Saved: packages/api/v2/.kiro/steering/tech.md');

      const call = consoleLogSpy.mock.calls[0][0];
      expect(String(call)).toMatch(/✓ Saved: \.kiro\/steering\/tech\.md/);
      expect(String(call)).not.toContain('packages/api/v2');
    });

    it('should handle success messages without .kiro/ prefix', () => {
      const options: ReporterOptions = { verbose: false, useColor: true };
      const reporter = new ProgressReporter(options);

      reporter.reportSuccess('Operation completed successfully');

      const call = consoleLogSpy.mock.calls[0][0];
      expect(String(call)).toMatch(/✓ Operation completed successfully/);
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

    it('should display branch information when branch is specified', () => {
      const options: ReporterOptions = { verbose: false, useColor: true };
      const reporter = new ProgressReporter(options);

      reporter.reportSummary(8, 2, undefined, 'feature-branch');

      const allCalls = consoleLogSpy.mock.calls.map((call) => call[0]);
      const hasBranchInfo = allCalls.some((msg) =>
        String(msg).includes('feature-branch')
      );

      expect(hasBranchInfo).toBe(true);
    });

    it('should display default branch information when branch is not specified (task 5.5)', () => {
      const options: ReporterOptions = { verbose: false, useColor: true };
      const reporter = new ProgressReporter(options);

      reporter.reportSummary(8, 2);

      const allCalls = consoleLogSpy.mock.calls.map((call) => call[0]);
      const hasDefaultBranch = allCalls.some((msg) =>
        /default branch/.test(String(msg))
      );

      expect(hasDefaultBranch).toBe(true);
    });

    it('should display both subdirectory and branch when both provided', () => {
      const options: ReporterOptions = { verbose: false, useColor: true };
      const reporter = new ProgressReporter(options);

      reporter.reportSummary(8, 2, 'packages/api', 'develop');

      const allCalls = consoleLogSpy.mock.calls.map((call) => call[0]);
      const hasSubdir = allCalls.some((msg) =>
        String(msg).includes('packages/api')
      );
      const hasBranch = allCalls.some((msg) =>
        String(msg).includes('develop')
      );

      expect(hasSubdir).toBe(true);
      expect(hasBranch).toBe(true);
    });

    it('should not display branch info when branch is empty string (task 5.5)', () => {
      const options: ReporterOptions = { verbose: false, useColor: true };
      const reporter = new ProgressReporter(options);

      reporter.reportSummary(8, 2, undefined, '');

      const allCalls = consoleLogSpy.mock.calls.map((call) => call[0]);
      const hasDefaultBranch = allCalls.some((msg) =>
        /default branch/.test(String(msg))
      );

      expect(hasDefaultBranch).toBe(true);
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

    // Task 8.3: Project-specific verbose display
    it('should display project name prefix in verbose mode when project provided (task 8.3)', () => {
      const options: ReporterOptions = { verbose: true, useColor: true };
      const reporter = new ProgressReporter(options);

      reporter.reportVerbose('取得中: file.md', 'proj1');

      const call = consoleLogSpy.mock.calls[0][0];
      expect(String(call)).toMatch(/\[proj1\].*取得中.*file\.md/);
    });

    it('should not display project prefix in verbose mode when project is undefined (task 8.3)', () => {
      const options: ReporterOptions = { verbose: true, useColor: true };
      const reporter = new ProgressReporter(options);

      reporter.reportVerbose('取得中: file.md', undefined);

      const call = consoleLogSpy.mock.calls[0][0];
      expect(String(call)).toMatch(/取得中.*file\.md/);
      expect(String(call)).not.toContain('[undefined]');
    });

    it('should handle empty project name in verbose mode (task 8.3)', () => {
      const options: ReporterOptions = { verbose: true, useColor: true };
      const reporter = new ProgressReporter(options);

      reporter.reportVerbose('取得中: file.md', '');

      const call = consoleLogSpy.mock.calls[0][0];
      expect(String(call)).toMatch(/取得中.*file\.md/);
      expect(String(call)).not.toMatch(/\[\]/);
    });
  });

  describe('reportProjectSummary', () => {
    // Task 8.4: Project-specific summary display
    it('should display project summary with success and failure counts (task 8.4)', () => {
      const options: ReporterOptions = { verbose: false, useColor: true };
      const reporter = new ProgressReporter(options);

      reporter.reportProjectSummary('proj1', 8, 2);

      const allCalls = consoleLogSpy.mock.calls.map((call) => call[0]);
      const hasSummary = allCalls.some((msg) =>
        String(msg).includes('[proj1]') &&
        String(msg).includes('8') &&
        String(msg).includes('2')
      );

      expect(hasSummary).toBe(true);
    });

    it('should display project summary with all success (task 8.4)', () => {
      const options: ReporterOptions = { verbose: false, useColor: true };
      const reporter = new ProgressReporter(options);

      reporter.reportProjectSummary('proj2', 10, 0);

      const allCalls = consoleLogSpy.mock.calls.map((call) => call[0]);
      const hasSummary = allCalls.some((msg) =>
        String(msg).includes('[proj2]') &&
        String(msg).includes('10')
      );

      expect(hasSummary).toBe(true);
    });

    it('should use colored output for project summary (task 8.4)', () => {
      const options: ReporterOptions = { verbose: false, useColor: true };
      const reporter = new ProgressReporter(options);

      reporter.reportProjectSummary('proj1', 5, 3);

      const calls = consoleLogSpy.mock.calls.flat();
      const hasColorCodes = calls.some((arg) =>
        String(arg).includes('\x1b[')
      );

      expect(hasColorCodes).toBe(true);
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
