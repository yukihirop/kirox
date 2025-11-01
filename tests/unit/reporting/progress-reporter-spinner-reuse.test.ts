/**
 * Unit tests for ProgressReporter - Spinner Reuse Issue (Task 14.4)
 *
 * Tests the critical bug where reportSuccess/reportError followed by reportProgress
 * causes the application to hang because ora spinners cannot be restarted after
 * being stopped with succeed() or fail().
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { SpyInstance } from 'vitest';
import { ProgressReporter } from '../../../src/reporting/progress-reporter.js';

describe('ProgressReporter - Spinner Reuse Issue (Task 14.4)', () => {
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

  describe('Critical Bug: Spinner reuse after succeed()', () => {
    it('should handle reportProgress → reportSuccess → reportProgress sequence without hanging', () => {
      const reporter = new ProgressReporter({ verbose: false, useColor: true });

      // First file: Start spinner
      reporter.reportProgress(1, 10, 'file1.md');

      // First file: Stop spinner with success
      reporter.reportSuccess('Saved: file1.md');

      // Second file: Should create a new spinner and not hang
      // This is where the bug occurs - ora cannot restart a stopped spinner
      expect(() => {
        reporter.reportProgress(2, 10, 'file2.md');
      }).not.toThrow();

      // Second file: Should be able to succeed as well
      expect(() => {
        reporter.reportSuccess('Saved: file2.md');
      }).not.toThrow();
    });

    it('should handle reportProgress → reportError → reportProgress sequence without hanging', () => {
      const reporter = new ProgressReporter({ verbose: false, useColor: true });

      // First file: Start spinner
      reporter.reportProgress(1, 10, 'file1.md');

      // First file: Stop spinner with error
      reporter.reportError('Failed: file1.md');

      // Second file: Should create a new spinner and not hang
      expect(() => {
        reporter.reportProgress(2, 10, 'file2.md');
      }).not.toThrow();

      // Second file: Should be able to succeed
      expect(() => {
        reporter.reportSuccess('Saved: file2.md');
      }).not.toThrow();
    });

    it('should handle multiple file fetches in sequence (realistic scenario)', () => {
      const reporter = new ProgressReporter({ verbose: false, useColor: true });

      // Simulate fetching 5 files sequentially
      for (let i = 1; i <= 5; i++) {
        // Start fetching file i
        expect(() => {
          reporter.reportProgress(i, 5, `file${i}.md`);
        }).not.toThrow();

        // Complete file i with success
        expect(() => {
          reporter.reportSuccess(`Saved: file${i}.md`);
        }).not.toThrow();
      }

      // All 5 files should have been processed without hanging or throwing errors
      // No assertion needed - if we reached here, the test passed (no hang occurred)
    });

    it('should handle mixed success and error in sequence', () => {
      const reporter = new ProgressReporter({ verbose: false, useColor: true });

      // File 1: Success
      reporter.reportProgress(1, 5, 'file1.md');
      reporter.reportSuccess('Saved: file1.md');

      // File 2: Error
      reporter.reportProgress(2, 5, 'file2.md');
      reporter.reportError('Failed: file2.md');

      // File 3: Success
      reporter.reportProgress(3, 5, 'file3.md');
      reporter.reportSuccess('Saved: file3.md');

      // File 4: Error
      reporter.reportProgress(4, 5, 'file4.md');
      reporter.reportError('Failed: file4.md');

      // File 5: Success
      expect(() => {
        reporter.reportProgress(5, 5, 'file5.md');
        reporter.reportSuccess('Saved: file5.md');
      }).not.toThrow();
    });
  });

  describe('Critical Bug: Spinner reuse in multi-project mode', () => {
    it('should handle multiple files for the same project without hanging', () => {
      const reporter = new ProgressReporter({ verbose: false, useColor: true });

      // Project A: File 1
      reporter.reportProgress(1, 3, 'file1.md', 'project-a');
      reporter.reportSuccess('Saved: file1.md', 'project-a');

      // Project A: File 2 (should not hang)
      expect(() => {
        reporter.reportProgress(2, 3, 'file2.md', 'project-a');
        reporter.reportSuccess('Saved: file2.md', 'project-a');
      }).not.toThrow();

      // Project A: File 3
      expect(() => {
        reporter.reportProgress(3, 3, 'file3.md', 'project-a');
        reporter.reportSuccess('Saved: file3.md', 'project-a');
      }).not.toThrow();
    });

    it('should handle interleaved files from multiple projects', () => {
      const reporter = new ProgressReporter({ verbose: false, useColor: true });

      // Project A: File 1
      reporter.reportProgress(1, 2, 'fileA1.md', 'project-a');
      reporter.reportSuccess('Saved: fileA1.md', 'project-a');

      // Project B: File 1
      reporter.reportProgress(1, 2, 'fileB1.md', 'project-b');
      reporter.reportSuccess('Saved: fileB1.md', 'project-b');

      // Project A: File 2 (should not hang even though project-a spinner was stopped)
      expect(() => {
        reporter.reportProgress(2, 2, 'fileA2.md', 'project-a');
        reporter.reportSuccess('Saved: fileA2.md', 'project-a');
      }).not.toThrow();

      // Project B: File 2
      expect(() => {
        reporter.reportProgress(2, 2, 'fileB2.md', 'project-b');
        reporter.reportSuccess('Saved: fileB2.md', 'project-b');
      }).not.toThrow();
    });

    it('should handle project completion followed by new files for same project', () => {
      const reporter = new ProgressReporter({ verbose: false, useColor: true });

      // Project A: Complete first batch
      reporter.reportProgress(1, 2, 'file1.md', 'project-a');
      reporter.reportSuccess('Saved: file1.md', 'project-a');
      reporter.reportProgress(2, 2, 'file2.md', 'project-a');
      reporter.reportSuccess('Saved: file2.md', 'project-a');

      // Project summary (cleans up spinner)
      reporter.reportProjectSummary('project-a', 2, 0);

      // Project A: New batch of files (should create new spinner)
      expect(() => {
        reporter.reportProgress(1, 1, 'file3.md', 'project-a');
        reporter.reportSuccess('Saved: file3.md', 'project-a');
      }).not.toThrow();
    });
  });

  describe('Edge cases: Spinner state management', () => {
    it('should handle reportProgress called twice before reportSuccess', () => {
      const reporter = new ProgressReporter({ verbose: false, useColor: true });

      // Start fetching file 1
      reporter.reportProgress(1, 5, 'file1.md');

      // Update progress (same file, different message)
      reporter.reportProgress(1, 5, 'file1.md (downloading...)');

      // Complete file 1
      expect(() => {
        reporter.reportSuccess('Saved: file1.md');
      }).not.toThrow();

      // Start file 2 (should not hang)
      expect(() => {
        reporter.reportProgress(2, 5, 'file2.md');
      }).not.toThrow();
    });

    it('should handle reportSuccess called without prior reportProgress', () => {
      const reporter = new ProgressReporter({ verbose: false, useColor: true });

      // Success without starting spinner (should fall back to console.log)
      reporter.reportSuccess('Unexpected success');

      // Now start normal flow
      expect(() => {
        reporter.reportProgress(1, 5, 'file1.md');
        reporter.reportSuccess('Saved: file1.md');
      }).not.toThrow();
    });

    it('should handle reportError followed immediately by reportProgress for different file', () => {
      const reporter = new ProgressReporter({ verbose: false, useColor: true });

      // File 1: Error
      reporter.reportProgress(1, 3, 'file1.md');
      reporter.reportError('Failed: file1.md');

      // File 2: Immediate start (no delay)
      expect(() => {
        reporter.reportProgress(2, 3, 'file2.md');
      }).not.toThrow();
    });
  });

  describe('Performance: Spinner instance management', () => {
    it('should not accumulate spinner instances in memory', () => {
      const reporter = new ProgressReporter({ verbose: false, useColor: true });

      // Process 100 files sequentially
      for (let i = 1; i <= 100; i++) {
        reporter.reportProgress(i, 100, `file${i}.md`);
        reporter.reportSuccess(`Saved: file${i}.md`);
      }

      // Should complete without memory issues or hanging
      // No assertion needed - if we reached here without timeout/hang, the test passed
    });

    it('should properly cleanup stopped spinners', () => {
      const reporter = new ProgressReporter({ verbose: false, useColor: true });

      // Create and stop spinner
      reporter.reportProgress(1, 2, 'file1.md', 'project-a');
      reporter.reportSuccess('Saved: file1.md', 'project-a');

      // reportProjectSummary should remove spinner from map
      reporter.reportProjectSummary('project-a', 1, 0);

      // New file for same project should create fresh spinner
      expect(() => {
        reporter.reportProgress(1, 1, 'file2.md', 'project-a');
        reporter.reportSuccess('Saved: file2.md', 'project-a');
      }).not.toThrow();
    });
  });
});
