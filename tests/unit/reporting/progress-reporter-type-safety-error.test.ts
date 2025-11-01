/**
 * Unit tests for ProgressReporter - Type Safety and Error Handling
 *
 * Task 14.3: Type safety and error handling edge case tests
 * Tests type safety with TypeScript and robust error handling for edge cases
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { SpyInstance } from 'vitest';
import { ProgressReporter } from '../../../src/reporting/progress-reporter.js';
import type { ReporterOptions } from '../../../src/reporting/types.js';

describe('ProgressReporter - Type Safety and Error Handling (Task 14.3)', () => {
  let consoleLogSpy: SpyInstance;
  let consoleErrorSpy: SpyInstance;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('Type Safety - ReporterOptions validation', () => {
    it('should accept valid ReporterOptions with all required fields', () => {
      const options: ReporterOptions = {
        verbose: true,
        useColor: true,
      };

      expect(() => new ProgressReporter(options)).not.toThrow();
    });

    it('should accept ReporterOptions with verbose=false and useColor=false', () => {
      const options: ReporterOptions = {
        verbose: false,
        useColor: false,
      };

      expect(() => new ProgressReporter(options)).not.toThrow();
    });

    it('should handle boolean type for verbose option correctly', () => {
      const options: ReporterOptions = {
        verbose: true,
        useColor: false,
      };

      const reporter = new ProgressReporter(options);

      // Verbose message should be displayed
      reporter.reportVerbose('test verbose message');
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('[VERBOSE] test verbose message')
      );
    });

    it('should handle boolean type for useColor option correctly', () => {
      const optionsWithColor: ReporterOptions = {
        verbose: false,
        useColor: true,
      };

      const optionsWithoutColor: ReporterOptions = {
        verbose: false,
        useColor: false,
      };

      // Both should create instances without errors
      expect(() => new ProgressReporter(optionsWithColor)).not.toThrow();
      expect(() => new ProgressReporter(optionsWithoutColor)).not.toThrow();
    });
  });

  describe('Type Safety - Method parameter validation', () => {
    let reporter: ProgressReporter;

    beforeEach(() => {
      reporter = new ProgressReporter({ verbose: false, useColor: true });
    });

    it('should accept valid number parameters in reportProgress', () => {
      expect(() => reporter.reportProgress(1, 10, 'test.md')).not.toThrow();
      expect(() => reporter.reportProgress(5, 10, 'test.md')).not.toThrow();
      expect(() => reporter.reportProgress(10, 10, 'test.md')).not.toThrow();
    });

    it('should accept valid string parameters in reportProgress', () => {
      expect(() => reporter.reportProgress(1, 5, 'test.md')).not.toThrow();
      expect(() => reporter.reportProgress(1, 5, '.kiro/specs/test.md')).not.toThrow();
      expect(() => reporter.reportProgress(1, 5, 'path/to/file.md')).not.toThrow();
    });

    it('should accept optional projectName parameter in reportProgress', () => {
      expect(() => reporter.reportProgress(1, 5, 'test.md')).not.toThrow();
      expect(() => reporter.reportProgress(1, 5, 'test.md', undefined)).not.toThrow();
      expect(() => reporter.reportProgress(1, 5, 'test.md', 'project-a')).not.toThrow();
      expect(() => reporter.reportProgress(1, 5, 'test.md', '')).not.toThrow();
    });

    it('should accept string parameters in reportSuccess', () => {
      reporter.reportProgress(1, 5, 'test.md'); // Start spinner first
      expect(() => reporter.reportSuccess('Saved: test.md')).not.toThrow();
      expect(() => reporter.reportSuccess('Operation completed')).not.toThrow();
    });

    it('should accept string parameters in reportError', () => {
      reporter.reportProgress(1, 5, 'test.md'); // Start spinner first
      expect(() => reporter.reportError('Failed to fetch file')).not.toThrow();
      expect(() => reporter.reportError('Network error occurred')).not.toThrow();
    });

    it('should accept reportStart overload with single project name', () => {
      expect(() => reporter.reportStart('owner/repo', 'project-a')).not.toThrow();
      expect(() => reporter.reportStart('owner/repo', 'project-a', 'subdir')).not.toThrow();
      expect(() => reporter.reportStart('owner/repo', 'project-a', undefined, 'main')).not.toThrow();
      expect(() => reporter.reportStart('owner/repo', 'project-a', 'subdir', 'main')).not.toThrow();
    });

    it('should accept reportStart overload with multiple project names', () => {
      expect(() => reporter.reportStart('owner/repo', ['proj1', 'proj2'])).not.toThrow();
      expect(() => reporter.reportStart('owner/repo', ['proj1'], 'subdir')).not.toThrow();
      expect(() =>
        reporter.reportStart('owner/repo', ['proj1', 'proj2', 'proj3'], undefined, 'develop')
      ).not.toThrow();
    });
  });

  describe('Error Handling - Invalid input edge cases', () => {
    let reporter: ProgressReporter;

    beforeEach(() => {
      reporter = new ProgressReporter({ verbose: false, useColor: true });
    });

    it('should handle zero or negative current/total in reportProgress', () => {
      // These are edge cases that should not crash the reporter
      expect(() => reporter.reportProgress(0, 10, 'test.md')).not.toThrow();
      expect(() => reporter.reportProgress(-1, 10, 'test.md')).not.toThrow();
      expect(() => reporter.reportProgress(1, 0, 'test.md')).not.toThrow();
      expect(() => reporter.reportProgress(1, -5, 'test.md')).not.toThrow();
    });

    it('should handle empty string fileName in reportProgress', () => {
      expect(() => reporter.reportProgress(1, 5, '')).not.toThrow();
    });

    it('should handle very long fileName in reportProgress', () => {
      const longFileName = 'a'.repeat(1000) + '.md';
      expect(() => reporter.reportProgress(1, 5, longFileName)).not.toThrow();
    });

    it('should handle whitespace-only projectName in reportProgress', () => {
      expect(() => reporter.reportProgress(1, 5, 'test.md', '   ')).not.toThrow();
      expect(() => reporter.reportProgress(1, 5, 'test.md', '\t\n')).not.toThrow();
    });

    it('should handle empty string message in reportSuccess', () => {
      reporter.reportProgress(1, 5, 'test.md');
      expect(() => reporter.reportSuccess('')).not.toThrow();
    });

    it('should handle empty string message in reportError', () => {
      reporter.reportProgress(1, 5, 'test.md');
      expect(() => reporter.reportError('')).not.toThrow();
    });

    it('should handle reportSuccess without prior reportProgress (no active spinner)', () => {
      // This should fall back to console.log instead of throwing error
      expect(() => reporter.reportSuccess('Success without spinner')).not.toThrow();
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('✓ Success without spinner'));
    });

    it('should handle reportError without prior reportProgress (no active spinner)', () => {
      // This should fall back to console.error instead of throwing error
      expect(() => reporter.reportError('Error without spinner')).not.toThrow();
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('✗ Error without spinner'));
    });
  });

  describe('Error Handling - Multiple spinner lifecycle edge cases', () => {
    let reporter: ProgressReporter;

    beforeEach(() => {
      reporter = new ProgressReporter({ verbose: false, useColor: true });
    });

    it('should handle multiple reportSuccess calls for the same project', () => {
      reporter.reportProgress(1, 5, 'file1.md', 'project-a');
      reporter.reportSuccess('Saved: file1.md', 'project-a');

      // Second success should not crash (spinner already stopped)
      expect(() => reporter.reportSuccess('Saved: file2.md', 'project-a')).not.toThrow();
    });

    it('should handle multiple reportError calls for the same project', () => {
      reporter.reportProgress(1, 5, 'file1.md', 'project-a');
      reporter.reportError('Failed: file1.md', 'project-a');

      // Second error should not crash (spinner already stopped)
      expect(() => reporter.reportError('Failed: file2.md', 'project-a')).not.toThrow();
    });

    it('should handle reportProjectSummary for non-existent project', () => {
      // Should not crash even if the project was never started
      expect(() => reporter.reportProjectSummary('non-existent-project', 0, 0)).not.toThrow();
    });

    it('should handle reportProjectSummary called multiple times for the same project', () => {
      reporter.reportProgress(1, 5, 'test.md', 'project-a');
      reporter.reportProjectSummary('project-a', 5, 0);

      // Second call should not crash
      expect(() => reporter.reportProjectSummary('project-a', 5, 0)).not.toThrow();
    });

    it('should handle stopAllSpinners when no spinners are active', () => {
      reporter.reportSummary(0, 0);
      // Second call should not crash
      expect(() => reporter.reportSummary(0, 0)).not.toThrow();
    });
  });

  describe('Error Handling - reportProjectError with various error types', () => {
    let reporter: ProgressReporter;

    beforeEach(() => {
      reporter = new ProgressReporter({ verbose: false, useColor: true });
    });

    it('should handle Error object in reportProjectError', () => {
      const error = new Error('Test error message');
      expect(() => reporter.reportProjectError('project-a', error)).not.toThrow();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('✗ [project-a] Error: Test error message')
      );
    });

    it('should handle string error in reportProjectError', () => {
      const error = 'String error message';
      expect(() => reporter.reportProjectError('project-a', error)).not.toThrow();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('✗ [project-a] Error: String error message')
      );
    });

    it('should handle unknown error type in reportProjectError', () => {
      const error = { code: 404, message: 'Not found' };
      expect(() => reporter.reportProjectError('project-a', error)).not.toThrow();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('✗ [project-a] Error: Unknown error')
      );
    });

    it('should handle null error in reportProjectError', () => {
      expect(() => reporter.reportProjectError('project-a', null)).not.toThrow();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('✗ [project-a] Error: Unknown error')
      );
    });

    it('should handle undefined error in reportProjectError', () => {
      expect(() => reporter.reportProjectError('project-a', undefined)).not.toThrow();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('✗ [project-a] Error: Unknown error')
      );
    });
  });

  describe('Error Handling - Special characters and Unicode', () => {
    let reporter: ProgressReporter;

    beforeEach(() => {
      reporter = new ProgressReporter({ verbose: false, useColor: true });
    });

    it('should handle file names with special characters', () => {
      expect(() => reporter.reportProgress(1, 5, 'file-with-!@#$%^&*().md')).not.toThrow();
      expect(() => reporter.reportProgress(1, 5, 'file with spaces.md')).not.toThrow();
      expect(() => reporter.reportProgress(1, 5, 'file\twith\ttabs.md')).not.toThrow();
    });

    it('should handle file names with Unicode characters', () => {
      expect(() => reporter.reportProgress(1, 5, 'ファイル名.md')).not.toThrow();
      expect(() => reporter.reportProgress(1, 5, '文件.md')).not.toThrow();
      expect(() => reporter.reportProgress(1, 5, 'файл.md')).not.toThrow();
      expect(() => reporter.reportProgress(1, 5, '🚀emoji.md')).not.toThrow();
    });

    it('should handle project names with Unicode characters', () => {
      expect(() => reporter.reportProgress(1, 5, 'test.md', 'プロジェクト名')).not.toThrow();
      expect(() => reporter.reportProgress(1, 5, 'test.md', '项目-中文')).not.toThrow();
    });

    it('should handle messages with Unicode in reportSuccess', () => {
      reporter.reportProgress(1, 5, 'test.md');
      expect(() => reporter.reportSuccess('保存完了: ファイル.md')).not.toThrow();
    });

    it('should handle messages with Unicode in reportError', () => {
      reporter.reportProgress(1, 5, 'test.md');
      expect(() => reporter.reportError('エラー: ファイルが見つかりません')).not.toThrow();
    });
  });

  describe('Error Handling - Extreme values', () => {
    let reporter: ProgressReporter;

    beforeEach(() => {
      reporter = new ProgressReporter({ verbose: false, useColor: true });
    });

    it('should handle very large current/total values', () => {
      expect(() => reporter.reportProgress(1000000, 2000000, 'test.md')).not.toThrow();
      expect(() => reporter.reportProgress(Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER, 'test.md')).not.toThrow();
    });

    it('should handle reportSummary with large success/failed counts', () => {
      expect(() => reporter.reportSummary(1000000, 500000)).not.toThrow();
    });

    it('should handle reportOverallSummary with large values', () => {
      expect(() => reporter.reportOverallSummary(1000, 5000000, 1000000)).not.toThrow();
    });

    it('should handle reportDryRunFileList with empty array', () => {
      expect(() => reporter.reportDryRunFileList([])).not.toThrow();
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('[DRY-RUN] Would fetch 0 files:'));
    });

    it('should handle reportDryRunFileList with very large array', () => {
      const largeFileList = Array.from({ length: 10000 }, (_, i) => `file${i}.md`);
      expect(() => reporter.reportDryRunFileList(largeFileList)).not.toThrow();
    });

    it('should handle reportPartialFailureSummary with empty arrays', () => {
      expect(() => reporter.reportPartialFailureSummary([], [])).not.toThrow();
    });

    it('should handle reportPartialFailureSummary with large arrays', () => {
      const largeFailedProjects = Array.from({ length: 1000 }, (_, i) => `failed-proj-${i}`);
      const largeSuccessfulProjects = Array.from({ length: 1000 }, (_, i) => `success-proj-${i}`);
      expect(() => reporter.reportPartialFailureSummary(largeFailedProjects, largeSuccessfulProjects)).not.toThrow();
    });
  });
});
