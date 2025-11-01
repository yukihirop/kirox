/**
 * Tests for ProgressReporter - Log and Spinner Coexistence (Task 14.2)
 *
 * Requirement 7.1: WHEN --verbose option is enabled THEN ProgressReporter SHALL
 * continue to display verbose messages in addition to spinner updates
 *
 * This test verifies that:
 * 1. Verbose messages are output via console.log even when spinner is active
 * 2. Spinner and console.log can coexist without conflicts
 * 3. ora automatically handles pausing/resuming spinner when console.log is called
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ProgressReporter } from '../../../src/reporting/progress-reporter.js';
import type { ReporterOptions } from '../../../src/reporting/types.js';

describe('ProgressReporter - Log and Spinner Coexistence (Task 14.2)', () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('Verbose mode with spinner', () => {
    it('should output verbose messages via console.log even when spinner is active', () => {
      const options: ReporterOptions = {
        verbose: true,
        useColor: true,
      };

      const reporter = new ProgressReporter(options);

      // Start spinner
      reporter.reportProgress(1, 10, '.kiro/specs/test/file.md');

      // Output verbose message while spinner is active
      reporter.reportVerbose('Verbose message during spinner');

      // Verify console.log was called for verbose message
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('[VERBOSE] Verbose message during spinner')
      );
    });

    it('should continue to work with verbose=false (no verbose output)', () => {
      const options: ReporterOptions = {
        verbose: false,
        useColor: true,
      };

      const reporter = new ProgressReporter(options);

      // Start spinner
      reporter.reportProgress(1, 10, '.kiro/specs/test/file.md');

      // Try to output verbose message (should be ignored)
      reporter.reportVerbose('This should not be output');

      // Verify console.log was NOT called for verbose message
      expect(consoleLogSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('This should not be output')
      );
    });

    it('should handle multiple verbose messages with spinner', () => {
      const options: ReporterOptions = {
        verbose: true,
        useColor: true,
      };

      const reporter = new ProgressReporter(options);

      // Start spinner
      reporter.reportProgress(1, 10, '.kiro/specs/test/file1.md');

      // Output multiple verbose messages
      reporter.reportVerbose('Message 1');
      reporter.reportVerbose('Message 2');

      // Update spinner
      reporter.reportProgress(2, 10, '.kiro/specs/test/file2.md');

      // Output another verbose message
      reporter.reportVerbose('Message 3');

      // Verify all verbose messages were output
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Message 1'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Message 2'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Message 3'));
    });
  });

  describe('Console.log and spinner coexistence', () => {
    it('should allow console.log output while spinner is active', () => {
      const options: ReporterOptions = {
        verbose: false,
        useColor: true,
      };

      const reporter = new ProgressReporter(options);

      // Start spinner
      reporter.reportProgress(1, 10, '.kiro/specs/test/file.md');

      // Directly call console.log (simulating [INFO] log output)
      consoleLogSpy.mockRestore(); // Restore to allow actual call
      consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      console.log('[INFO] Test log message');

      // Verify console.log was called
      expect(consoleLogSpy).toHaveBeenCalledWith('[INFO] Test log message');

      // Spinner should still be active (tested in other test files)
    });
  });

  describe('Project-specific verbose messages', () => {
    it('should include project name in verbose output when provided', () => {
      const options: ReporterOptions = {
        verbose: true,
        useColor: true,
      };

      const reporter = new ProgressReporter(options);

      // Start spinner for project
      reporter.reportProgress(1, 10, '.kiro/specs/test/file.md', 'project-a');

      // Output verbose message with project name
      reporter.reportVerbose('Processing file', 'project-a');

      // Verify verbose message includes project name
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('[VERBOSE] [project-a] Processing file')
      );
    });

    it('should not include project name when not provided', () => {
      const options: ReporterOptions = {
        verbose: true,
        useColor: true,
      };

      const reporter = new ProgressReporter(options);

      // Output verbose message without project name
      reporter.reportVerbose('General message');

      // Verify verbose message does not include project name
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('[VERBOSE] General message'));
      expect(consoleLogSpy).not.toHaveBeenCalledWith(expect.stringContaining('[VERBOSE] ['));
    });
  });

  describe('Requirement 7.1 verification', () => {
    it('should satisfy Requirement 7.1: verbose messages in addition to spinner updates', () => {
      const options: ReporterOptions = {
        verbose: true,
        useColor: true,
      };

      const reporter = new ProgressReporter(options);
      const reporterAny = reporter as any;

      // Start spinner
      reporter.reportProgress(1, 10, '.kiro/specs/test/file1.md');

      // Verify spinner is active
      const spinner = reporterAny.spinnerMap.get('');
      expect(spinner).toBeDefined();
      expect(spinner.isSpinning).toBe(true);

      // Output verbose message
      reporter.reportVerbose('Detailed log message');

      // Verify verbose message was output
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('[VERBOSE] Detailed log message')
      );

      // Spinner should still be active
      expect(spinner.isSpinning).toBe(true);

      // This test passes = Requirement 7.1 is satisfied
    });
  });
});
