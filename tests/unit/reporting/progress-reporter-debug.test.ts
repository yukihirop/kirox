/**
 * Debug Tests for ProgressReporter Spinner Initialization
 *
 * Task 14.1: Tests to identify root cause of spinner not displaying
 *
 * These tests are designed to help diagnose why spinners are not showing up
 * in the actual CLI execution.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ProgressReporter } from '../../../src/reporting/progress-reporter.js';
import type { ReporterOptions } from '../../../src/reporting/types.js';

describe('ProgressReporter - Spinner Initialization Debug', () => {
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

  describe('Spinner Initialization State', () => {
    it('should NOT be in fallback mode when initialized with default options', () => {
      const options: ReporterOptions = {
        verbose: false,
        useColor: true,
      };

      const reporter = new ProgressReporter(options);

      // Access private field using type assertion
      const useFallback = (reporter as any).useFallback;

      // EXPECTED: useFallback should be false (spinner mode enabled)
      expect(useFallback).toBe(false);
    });

    it('should log debug info if verbose mode is enabled during initialization', () => {
      const options: ReporterOptions = {
        verbose: true,
        useColor: true,
      };

      const reporter = new ProgressReporter(options);

      // Check if any initialization logs were output
      const useFallback = (reporter as any).useFallback;

      if (useFallback) {
        // If in fallback mode, there should be a warning log
        expect(consoleLogSpy).toHaveBeenCalledWith(
          expect.stringContaining('Spinner initialization failed')
        );
      } else {
        // If NOT in fallback mode, no warning should be logged
        expect(consoleLogSpy).not.toHaveBeenCalledWith(
          expect.stringContaining('Spinner initialization failed')
        );
      }
    });

    it('should have a spinner in spinnerMap after reportProgress is called', () => {
      const options: ReporterOptions = {
        verbose: false,
        useColor: true,
      };

      const reporter = new ProgressReporter(options);

      // Call reportProgress to trigger spinner creation
      reporter.reportProgress(1, 10, '.kiro/specs/test/file.md');

      // Access private spinnerMap
      const spinnerMap = (reporter as any).spinnerMap;
      const useFallback = (reporter as any).useFallback;

      if (!useFallback) {
        // In spinner mode, spinnerMap should have at least one entry
        expect(spinnerMap.size).toBeGreaterThan(0);

        // Default spinner key is empty string
        expect(spinnerMap.has('')).toBe(true);

        // Spinner should be spinning
        const spinner = spinnerMap.get('');
        expect(spinner.isSpinning).toBe(true);
      } else {
        // In fallback mode, spinnerMap should be empty
        expect(spinnerMap.size).toBe(0);
      }
    });

    it('should call spinner.start() when reportProgress is called for the first time', () => {
      const options: ReporterOptions = {
        verbose: false,
        useColor: true,
      };

      const reporter = new ProgressReporter(options);
      const useFallback = (reporter as any).useFallback;

      // If not in fallback mode, test spinner behavior
      if (!useFallback) {
        reporter.reportProgress(1, 10, '.kiro/specs/test/file.md');

        const spinnerMap = (reporter as any).spinnerMap;
        const spinner = spinnerMap.get('');

        // Spinner should be in spinning state
        expect(spinner).toBeDefined();
        expect(spinner.isSpinning).toBe(true);
      } else {
        // In fallback mode, console.log should be called
        expect(consoleLogSpy).toHaveBeenCalled();
      }
    });

    it('should update spinner.text when reportProgress is called multiple times', () => {
      const options: ReporterOptions = {
        verbose: false,
        useColor: true,
      };

      const reporter = new ProgressReporter(options);
      const useFallback = (reporter as any).useFallback;

      if (!useFallback) {
        // First call - spinner starts
        reporter.reportProgress(1, 10, '.kiro/specs/test/file1.md');

        const spinnerMap = (reporter as any).spinnerMap;
        const spinner = spinnerMap.get('');

        const firstText = spinner.text;
        expect(firstText).toContain('file1.md');

        // Second call - spinner text updates
        reporter.reportProgress(2, 10, '.kiro/specs/test/file2.md');

        const secondText = spinner.text;
        expect(secondText).toContain('file2.md');
        expect(secondText).not.toContain('file1.md');

        // Spinner should still be spinning
        expect(spinner.isSpinning).toBe(true);
      }
    });
  });

  describe('Spinner Lifecycle Debug', () => {
    it('should stop spinner when reportSuccess is called', () => {
      const options: ReporterOptions = {
        verbose: false,
        useColor: true,
      };

      const reporter = new ProgressReporter(options);
      const useFallback = (reporter as any).useFallback;

      if (!useFallback) {
        // Start spinner
        reporter.reportProgress(1, 10, '.kiro/specs/test/file.md');

        const spinnerMap = (reporter as any).spinnerMap;
        const spinner = spinnerMap.get('');

        expect(spinner.isSpinning).toBe(true);

        // Stop spinner with success
        reporter.reportSuccess('Saved: .kiro/specs/test/file.md');

        // Spinner should have stopped
        expect(spinner.isSpinning).toBe(false);
      }
    });

    it('should stop spinner when reportError is called', () => {
      const options: ReporterOptions = {
        verbose: false,
        useColor: true,
      };

      const reporter = new ProgressReporter(options);
      const useFallback = (reporter as any).useFallback;

      if (!useFallback) {
        // Start spinner
        reporter.reportProgress(1, 10, '.kiro/specs/test/file.md');

        const spinnerMap = (reporter as any).spinnerMap;
        const spinner = spinnerMap.get('');

        expect(spinner.isSpinning).toBe(true);

        // Stop spinner with error
        reporter.reportError('Failed to fetch file');

        // Spinner should have stopped
        expect(spinner.isSpinning).toBe(false);
      }
    });
  });

  describe('Fallback Mode Detection', () => {
    it('should detect if we are always in fallback mode (potential bug)', () => {
      const options: ReporterOptions = {
        verbose: true, // Enable verbose to see warnings
        useColor: true,
      };

      const reporter = new ProgressReporter(options);
      const useFallback = (reporter as any).useFallback;

      // If this test fails (useFallback is always true), that's the bug!
      // This test is intentionally designed to FAIL if there's a bug
      if (useFallback) {
        console.log('🐛 BUG DETECTED: Reporter is in fallback mode!');
        console.log('Initialization warning:', consoleLogSpy.mock.calls);
      }

      // This assertion might fail if there's a bug
      // We expect NOT to be in fallback mode
      expect(useFallback).toBe(false);
    });
  });
});
