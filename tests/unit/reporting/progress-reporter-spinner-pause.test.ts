/**
 * ProgressReporter - Spinner Pause/Resume (Task 14.7)
 *
 * Tests for pausing spinner before readline prompts to prevent hidden prompts.
 *
 * Bug: When ora spinner is active and readline prompt is displayed,
 * the prompt is hidden from user, making it appear "frozen".
 *
 * Fix: Add pauseSpinner()/resumeSpinner() methods to ProgressReporter
 * to temporarily stop spinner before showing prompts.
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

describe('ProgressReporter - Spinner Pause/Resume (Task 14.7)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('pauseSpinner()', () => {
    it('should stop active spinner when called', async () => {
      const { ProgressReporter } = await import(
        '../../../src/reporting/progress-reporter.js'
      );
      const reporter = new ProgressReporter({ verbose: false, useColor: true });

      // Start spinner
      reporter.reportProgress(1, 10, 'file.md');

      const reporterAny = reporter as unknown as {
        spinnerMap: Map<string, Ora>;
        pauseSpinner: (projectName?: string) => void;
      };

      const spinner = reporterAny.spinnerMap.get('');
      expect(spinner).toBeDefined();
      expect(spinner!.isSpinning).toBe(true);

      // Pause spinner
      reporterAny.pauseSpinner();

      // Spinner should be stopped
      expect(spinner!.stop).toHaveBeenCalled();
      expect(spinner!.isSpinning).toBe(false);
    });

    it('should pause project-specific spinner', async () => {
      const { ProgressReporter } = await import(
        '../../../src/reporting/progress-reporter.js'
      );
      const reporter = new ProgressReporter({ verbose: false, useColor: true });

      // Start spinner for project
      reporter.reportProgress(1, 10, 'file.md', 'proj1');

      const reporterAny = reporter as unknown as {
        spinnerMap: Map<string, Ora>;
        pauseSpinner: (projectName?: string) => void;
      };

      const spinner = reporterAny.spinnerMap.get('proj1');
      expect(spinner).toBeDefined();
      expect(spinner!.isSpinning).toBe(true);

      // Pause project-specific spinner
      reporterAny.pauseSpinner('proj1');

      // Spinner should be stopped
      expect(spinner!.stop).toHaveBeenCalled();
      expect(spinner!.isSpinning).toBe(false);
    });

    it('should not throw error if no spinner exists', async () => {
      const { ProgressReporter } = await import(
        '../../../src/reporting/progress-reporter.js'
      );
      const reporter = new ProgressReporter({ verbose: false, useColor: true });

      const reporterAny = reporter as unknown as {
        pauseSpinner: (projectName?: string) => void;
      };

      // Should not throw error when pausing non-existent spinner
      expect(() => reporterAny.pauseSpinner()).not.toThrow();
      expect(() => reporterAny.pauseSpinner('proj1')).not.toThrow();
    });

    it('should not throw error if spinner is already stopped', async () => {
      const { ProgressReporter } = await import(
        '../../../src/reporting/progress-reporter.js'
      );
      const reporter = new ProgressReporter({ verbose: false, useColor: true });

      // Start and stop spinner
      reporter.reportProgress(1, 10, 'file.md');
      reporter.reportSuccess('Done');

      const reporterAny = reporter as unknown as {
        pauseSpinner: (projectName?: string) => void;
      };

      // Should not throw error when pausing already stopped spinner
      expect(() => reporterAny.pauseSpinner()).not.toThrow();
    });

    it('should work in fallback mode without errors', async () => {
      const { ProgressReporter } = await import(
        '../../../src/reporting/progress-reporter.js'
      );
      const reporter = new ProgressReporter({ verbose: false, useColor: true });

      // Force fallback mode
      (reporter as unknown as { useFallback: boolean }).useFallback = true;

      const reporterAny = reporter as unknown as {
        pauseSpinner: (projectName?: string) => void;
      };

      // Should not throw error in fallback mode
      expect(() => reporterAny.pauseSpinner()).not.toThrow();
    });
  });

  describe('resumeSpinner()', () => {
    it('should restart paused spinner with same text', async () => {
      const { ProgressReporter } = await import(
        '../../../src/reporting/progress-reporter.js'
      );
      const reporter = new ProgressReporter({ verbose: false, useColor: true });

      // Start spinner
      reporter.reportProgress(1, 10, 'file.md');

      const reporterAny = reporter as unknown as {
        spinnerMap: Map<string, Ora>;
        pauseSpinner: (projectName?: string) => void;
        resumeSpinner: (projectName?: string) => void;
      };

      const spinner = reporterAny.spinnerMap.get('');
      expect(spinner).toBeDefined();

      // Store original text
      const originalText = spinner!.text;

      // Pause spinner
      reporterAny.pauseSpinner();
      expect(spinner!.isSpinning).toBe(false);

      // Resume spinner
      reporterAny.resumeSpinner();

      // Spinner should be restarted with same text
      expect(spinner!.start).toHaveBeenCalledWith(originalText);
      expect(spinner!.isSpinning).toBe(true);
    });

    it('should resume project-specific spinner', async () => {
      const { ProgressReporter } = await import(
        '../../../src/reporting/progress-reporter.js'
      );
      const reporter = new ProgressReporter({ verbose: false, useColor: true });

      // Start spinner for project
      reporter.reportProgress(1, 10, 'file.md', 'proj1');

      const reporterAny = reporter as unknown as {
        spinnerMap: Map<string, Ora>;
        pauseSpinner: (projectName?: string) => void;
        resumeSpinner: (projectName?: string) => void;
      };

      const spinner = reporterAny.spinnerMap.get('proj1');
      expect(spinner).toBeDefined();

      const originalText = spinner!.text;

      // Pause and resume project-specific spinner
      reporterAny.pauseSpinner('proj1');
      reporterAny.resumeSpinner('proj1');

      // Spinner should be restarted
      expect(spinner!.start).toHaveBeenCalledWith(originalText);
      expect(spinner!.isSpinning).toBe(true);
    });

    it('should not throw error if no spinner exists', async () => {
      const { ProgressReporter } = await import(
        '../../../src/reporting/progress-reporter.js'
      );
      const reporter = new ProgressReporter({ verbose: false, useColor: true });

      const reporterAny = reporter as unknown as {
        resumeSpinner: (projectName?: string) => void;
      };

      // Should not throw error when resuming non-existent spinner
      expect(() => reporterAny.resumeSpinner()).not.toThrow();
      expect(() => reporterAny.resumeSpinner('proj1')).not.toThrow();
    });

    it('should work in fallback mode without errors', async () => {
      const { ProgressReporter } = await import(
        '../../../src/reporting/progress-reporter.js'
      );
      const reporter = new ProgressReporter({ verbose: false, useColor: true });

      // Force fallback mode
      (reporter as unknown as { useFallback: boolean }).useFallback = true;

      const reporterAny = reporter as unknown as {
        resumeSpinner: (projectName?: string) => void;
      };

      // Should not throw error in fallback mode
      expect(() => reporterAny.resumeSpinner()).not.toThrow();
    });
  });

  describe('Pause/Resume workflow', () => {
    it('should handle pause/resume/pause/resume sequence correctly', async () => {
      const { ProgressReporter } = await import(
        '../../../src/reporting/progress-reporter.js'
      );
      const reporter = new ProgressReporter({ verbose: false, useColor: true });

      reporter.reportProgress(1, 10, 'file.md');

      const reporterAny = reporter as unknown as {
        spinnerMap: Map<string, Ora>;
        pauseSpinner: (projectName?: string) => void;
        resumeSpinner: (projectName?: string) => void;
      };

      const spinner = reporterAny.spinnerMap.get('');

      // Pause -> Resume -> Pause -> Resume
      reporterAny.pauseSpinner();
      expect(spinner!.isSpinning).toBe(false);

      reporterAny.resumeSpinner();
      expect(spinner!.isSpinning).toBe(true);

      reporterAny.pauseSpinner();
      expect(spinner!.isSpinning).toBe(false);

      reporterAny.resumeSpinner();
      expect(spinner!.isSpinning).toBe(true);
    });

    it('should allow progress update after resume', async () => {
      const { ProgressReporter } = await import(
        '../../../src/reporting/progress-reporter.js'
      );
      const reporter = new ProgressReporter({ verbose: false, useColor: true });

      reporter.reportProgress(1, 10, 'file1.md');

      const reporterAny = reporter as unknown as {
        spinnerMap: Map<string, Ora>;
        pauseSpinner: (projectName?: string) => void;
        resumeSpinner: (projectName?: string) => void;
      };

      const spinner = reporterAny.spinnerMap.get('');

      // Pause, resume, then update progress
      reporterAny.pauseSpinner();
      reporterAny.resumeSpinner();

      reporter.reportProgress(2, 10, 'file2.md');

      // Spinner should have updated text
      expect(spinner!.text).toContain('file2.md');
    });
  });
});
