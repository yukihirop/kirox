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
        /Fetching 3 projects|3 projects/i.test(String(msg)) ||
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
        /Fetching 2 projects|2 projects/i.test(String(msg))
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
        /Fetching 2 projects|2 projects/i.test(String(msg))
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
        /Fetching.*projects/i.test(String(msg))
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

  describe('reportOverallSummary', () => {
    it('should display overall summary with project count and file counts', () => {
      const options: ReporterOptions = { verbose: false, useColor: true };
      const reporter = new ProgressReporter(options);

      reporter.reportOverallSummary(3, 24, 3);

      // Check all console.log calls
      const allCalls = consoleLogSpy.mock.calls.map((call) => call[0]);
      const hasHeader = allCalls.some((msg) => String(msg).includes('Overall Summary'));
      const hasProjectCount = allCalls.some((msg) => /Projects.*3/i.test(String(msg)));
      const hasTotalFiles = allCalls.some((msg) => /Total files.*27/i.test(String(msg)));
      const hasSuccess = allCalls.some((msg) => /Succeeded.*24.*files/i.test(String(msg)));
      const hasFailed = allCalls.some((msg) => /Failed.*3.*files/i.test(String(msg)));

      expect(hasHeader).toBe(true);
      expect(hasProjectCount).toBe(true);
      expect(hasTotalFiles).toBe(true);
      expect(hasSuccess).toBe(true);
      expect(hasFailed).toBe(true);
    });

    it('should display overall summary when all files succeeded', () => {
      const options: ReporterOptions = { verbose: false, useColor: true };
      const reporter = new ProgressReporter(options);

      reporter.reportOverallSummary(2, 20, 0);

      // Check all console.log calls
      const allCalls = consoleLogSpy.mock.calls.map((call) => call[0]);
      const hasProjectCount = allCalls.some((msg) => /Projects.*2/i.test(String(msg)));
      const hasTotalFiles = allCalls.some((msg) => /Total files.*20/i.test(String(msg)));
      const hasSuccess = allCalls.some((msg) => /Succeeded.*20.*files/i.test(String(msg)));
      const hasFailed = allCalls.some((msg) => /Failed.*0.*files/i.test(String(msg)));

      expect(hasProjectCount).toBe(true);
      expect(hasTotalFiles).toBe(true);
      expect(hasSuccess).toBe(true);
      expect(hasFailed).toBe(true);
    });

    it('should use cyan color for overall summary when useColor is true', () => {
      const options: ReporterOptions = { verbose: false, useColor: true };
      const reporter = new ProgressReporter(options);

      reporter.reportOverallSummary(3, 24, 3);

      const calls = consoleLogSpy.mock.calls.flat();
      const hasCyanCode = calls.some((arg) =>
        String(arg).includes('\x1b[36m')
      );

      expect(hasCyanCode).toBe(true);
    });
  });

  describe('Backward compatibility for single-project operations (task 8.6)', () => {
    it('should maintain single-project reportStart behavior with string argument', () => {
      const options: ReporterOptions = { verbose: false, useColor: true };
      const reporter = new ProgressReporter(options);

      reporter.reportStart('owner/repo', 'single-project');

      // Check for single-project display format (not multi-project format)
      const allCalls = consoleLogSpy.mock.calls.map((call) => call[0]);
      const hasSingleProjectDisplay = allCalls.some((msg) =>
        String(msg).includes('Project: single-project')
      );
      const hasMultiProjectDisplay = allCalls.some((msg) =>
        /Fetching.*projects/i.test(String(msg))
      );

      expect(hasSingleProjectDisplay).toBe(true);
      expect(hasMultiProjectDisplay).toBe(false);
    });

    it('should not display project prefix in reportProgress for single-project mode', () => {
      const options: ReporterOptions = { verbose: false, useColor: true };
      const reporter = new ProgressReporter(options);

      // Single-project mode: projectName is undefined or empty
      reporter.reportProgress(1, 10, 'test.md', undefined);

      const allCalls = consoleLogSpy.mock.calls.map((call) => call[0]);
      const hasProjectPrefix = allCalls.some((msg) =>
        /\[.*\]\s*\[1\/10\]/.test(String(msg))
      );
      const hasCorrectFormat = allCalls.some((msg) =>
        /\[1\/10\]\s*Fetching/.test(String(msg))
      );

      expect(hasProjectPrefix).toBe(false);
      expect(hasCorrectFormat).toBe(true);
    });

    it('should not display project prefix in reportVerbose for single-project mode', () => {
      const options: ReporterOptions = { verbose: true, useColor: true };
      const reporter = new ProgressReporter(options);

      // Single-project mode: projectName is undefined
      reporter.reportVerbose('Processing file', undefined);

      const allCalls = consoleLogSpy.mock.calls.map((call) => call[0]);
      const hasProjectPrefix = allCalls.some((msg) =>
        /\[VERBOSE\]\s*\[.*\]\s*Processing/.test(String(msg))
      );
      const hasCorrectFormat = allCalls.some((msg) =>
        /\[VERBOSE\]\s*Processing/.test(String(msg))
      );

      expect(hasProjectPrefix).toBe(false);
      expect(hasCorrectFormat).toBe(true);
    });

    it('should maintain existing reportSummary behavior for single-project', () => {
      const options: ReporterOptions = { verbose: false, useColor: true };
      const reporter = new ProgressReporter(options);

      reporter.reportSummary(8, 2);

      // Check that reportSummary works as before (no project-specific info)
      const allCalls = consoleLogSpy.mock.calls.map((call) => call[0]);
      const hasSuccessMessage = allCalls.some((msg) => /8.*succeeded/i.test(String(msg)));
      const hasFailedMessage = allCalls.some((msg) => /2.*failed/i.test(String(msg)));

      expect(hasSuccessMessage).toBe(true);
      expect(hasFailedMessage).toBe(true);
    });

    it('should not display overall summary for single-project operations', () => {
      const options: ReporterOptions = { verbose: false, useColor: true };
      const reporter = new ProgressReporter(options);

      // In single-project mode, reportOverallSummary should NOT be called
      // This test verifies that the method exists but is only used for multi-project
      // We verify this indirectly by checking that reportSummary works standalone
      reporter.reportSummary(10, 0);

      const allCalls = consoleLogSpy.mock.calls.map((call) => call[0]);
      const hasOverallSummaryHeader = allCalls.some((msg) =>
        String(msg).includes('Overall Summary')
      );

      // reportSummary alone should NOT show overall summary header
      expect(hasOverallSummaryHeader).toBe(false);
    });
  });

  describe('reportProjectError (task 9.1)', () => {
    it('should display project-specific error with project name prefix', () => {
      const options: ReporterOptions = { verbose: false, useColor: true };
      const reporter = new ProgressReporter(options);

      const error = new Error('GitHub API failed');
      reporter.reportProjectError('proj1', error);

      const allCalls = consoleErrorSpy.mock.calls.map((call) => call[0]);
      const hasProjectPrefix = allCalls.some((msg) =>
        String(msg).includes('[proj1]')
      );
      const hasErrorMessage = allCalls.some((msg) =>
        String(msg).includes('GitHub API failed')
      );

      expect(hasProjectPrefix).toBe(true);
      expect(hasErrorMessage).toBe(true);
    });

    it('should use red color for project error when useColor is true', () => {
      const options: ReporterOptions = { verbose: false, useColor: true };
      const reporter = new ProgressReporter(options);

      const error = new Error('Test error');
      reporter.reportProjectError('proj2', error);

      const calls = consoleErrorSpy.mock.calls.flat();
      const hasRedCode = calls.some((arg) =>
        String(arg).includes('\x1b[31m')
      );

      expect(hasRedCode).toBe(true);
    });

    it('should handle non-Error objects gracefully', () => {
      const options: ReporterOptions = { verbose: false, useColor: true };
      const reporter = new ProgressReporter(options);

      reporter.reportProjectError('proj3', 'String error');

      const allCalls = consoleErrorSpy.mock.calls.map((call) => call[0]);
      const hasProjectPrefix = allCalls.some((msg) =>
        String(msg).includes('[proj3]')
      );
      const hasErrorInfo = allCalls.some((msg) =>
        String(msg).includes('String error') || String(msg).includes('Unknown error')
      );

      expect(hasProjectPrefix).toBe(true);
      expect(hasErrorInfo).toBe(true);
    });

    it('should display error with X mark', () => {
      const options: ReporterOptions = { verbose: false, useColor: true };
      const reporter = new ProgressReporter(options);

      const error = new Error('File write failed');
      reporter.reportProjectError('proj4', error);

      const allCalls = consoleErrorSpy.mock.calls.map((call) => call[0]);
      const hasErrorMark = allCalls.some((msg) =>
        String(msg).includes('✗') || String(msg).includes('Error')
      );

      expect(hasErrorMark).toBe(true);
    });
  });

  describe('reportPartialFailureSummary (task 9.3)', () => {
    it('should display failed and successful project lists', () => {
      const options: ReporterOptions = { verbose: false, useColor: true };
      const reporter = new ProgressReporter(options);

      const failedProjects = ['proj1', 'proj3'];
      const successfulProjects = ['proj2', 'proj4'];

      reporter.reportPartialFailureSummary(failedProjects, successfulProjects);

      const allCalls = consoleLogSpy.mock.calls.map((call) => call[0]);
      const hasFailedHeader = allCalls.some((msg) => String(msg).includes('Failed projects'));
      const hasFailedProj1 = allCalls.some((msg) => String(msg).includes('proj1'));
      const hasFailedProj3 = allCalls.some((msg) => String(msg).includes('proj3'));
      const hasSuccessHeader = allCalls.some((msg) => String(msg).includes('Successful projects'));
      const hasSuccessProj2 = allCalls.some((msg) => String(msg).includes('proj2'));
      const hasSuccessProj4 = allCalls.some((msg) => String(msg).includes('proj4'));

      expect(hasFailedHeader).toBe(true);
      expect(hasFailedProj1).toBe(true);
      expect(hasFailedProj3).toBe(true);
      expect(hasSuccessHeader).toBe(true);
      expect(hasSuccessProj2).toBe(true);
      expect(hasSuccessProj4).toBe(true);
    });

    it('should use red color for failed projects and green for successful', () => {
      const options: ReporterOptions = { verbose: false, useColor: true };
      const reporter = new ProgressReporter(options);

      const failedProjects = ['proj1'];
      const successfulProjects = ['proj2'];

      reporter.reportPartialFailureSummary(failedProjects, successfulProjects);

      const calls = consoleLogSpy.mock.calls.flat();
      const hasRedCode = calls.some((arg) =>
        String(arg).includes('\x1b[31m')
      );
      const hasGreenCode = calls.some((arg) =>
        String(arg).includes('\x1b[32m')
      );

      expect(hasRedCode).toBe(true);
      expect(hasGreenCode).toBe(true);
    });

    it('should handle empty successful projects list', () => {
      const options: ReporterOptions = { verbose: false, useColor: true };
      const reporter = new ProgressReporter(options);

      const failedProjects = ['proj1', 'proj2'];
      const successfulProjects: string[] = [];

      reporter.reportPartialFailureSummary(failedProjects, successfulProjects);

      const allCalls = consoleLogSpy.mock.calls.map((call) => call[0]);
      const hasFailedHeader = allCalls.some((msg) => String(msg).includes('Failed projects'));
      const hasNoSuccessProjects = allCalls.some((msg) =>
        String(msg).includes('No successful projects') ||
        String(msg).includes('0 projects')
      );

      expect(hasFailedHeader).toBe(true);
      expect(allCalls.some((msg) => String(msg).includes('proj1'))).toBe(true);
      expect(allCalls.some((msg) => String(msg).includes('proj2'))).toBe(true);
    });

    it('should display project counts', () => {
      const options: ReporterOptions = { verbose: false, useColor: true };
      const reporter = new ProgressReporter(options);

      const failedProjects = ['proj1', 'proj2'];
      const successfulProjects = ['proj3'];

      reporter.reportPartialFailureSummary(failedProjects, successfulProjects);

      const allCalls = consoleLogSpy.mock.calls.map((call) => call[0]);
      const hasFailedCount = allCalls.some((msg) => /Failed.*2/i.test(String(msg)));
      const hasSuccessCount = allCalls.some((msg) => /Successful.*1/i.test(String(msg)));

      expect(hasFailedCount).toBe(true);
      expect(hasSuccessCount).toBe(true);
    });
  });
});
