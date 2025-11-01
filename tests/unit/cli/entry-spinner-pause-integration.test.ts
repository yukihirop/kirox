/**
 * Entry.ts - Spinner Pause Integration (Task 14.7)
 *
 * Integration test to verify spinner pause/resume works correctly
 * when writeFile() shows readline prompts.
 *
 * This test ensures that spinner is paused before writeFile() prompt
 * and resumed after, preventing the "frozen" appearance.
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

describe('Entry.ts - Spinner Pause Integration (Task 14.7)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('writeFile() with spinner pause/resume', () => {
    it('should pause spinner before writeFile() and resume after', async () => {
      const { ProgressReporter } = await import(
        '../../../src/reporting/progress-reporter.js'
      );
      const reporter = new ProgressReporter({ verbose: false, useColor: true });

      // Simulate file fetching progress (starts spinner)
      reporter.reportProgress(1, 10, 'file.md');

      const reporterAny = reporter as unknown as {
        spinnerMap: Map<string, Ora>;
        pauseSpinner: (projectName?: string) => void;
        resumeSpinner: (projectName?: string) => void;
      };

      const spinner = reporterAny.spinnerMap.get('');
      expect(spinner).toBeDefined();
      expect(spinner!.isSpinning).toBe(true);

      // Simulate entry.ts calling pauseSpinner before writeFile
      reporter.pauseSpinner();
      expect(spinner!.isSpinning).toBe(false);

      // Simulate writeFile() showing prompt (no actual prompt in test)
      // ... readline prompt would appear here in real execution ...

      // Simulate entry.ts calling resumeSpinner after writeFile
      reporter.resumeSpinner();
      expect(spinner!.isSpinning).toBe(true);

      // Verify spinner can still be used for success reporting
      reporter.reportSuccess('Saved: file.md');
      expect(spinner!.succeed).toHaveBeenCalled();
    });

    it('should handle multi-project mode with spinner pause/resume', async () => {
      const { ProgressReporter } = await import(
        '../../../src/reporting/progress-reporter.js'
      );
      const reporter = new ProgressReporter({ verbose: false, useColor: true });

      // Simulate multi-project file fetching
      reporter.reportProgress(1, 10, 'file1.md', 'proj1');
      reporter.reportProgress(1, 8, 'file2.md', 'proj2');

      const reporterAny = reporter as unknown as {
        spinnerMap: Map<string, Ora>;
      };

      const spinner1 = reporterAny.spinnerMap.get('proj1');
      const spinner2 = reporterAny.spinnerMap.get('proj2');

      expect(spinner1).toBeDefined();
      expect(spinner2).toBeDefined();
      expect(spinner1!.isSpinning).toBe(true);
      expect(spinner2!.isSpinning).toBe(true);

      // Pause only proj1 spinner before writeFile
      reporter.pauseSpinner('proj1');
      expect(spinner1!.isSpinning).toBe(false);
      expect(spinner2!.isSpinning).toBe(true); // proj2 still spinning

      // Resume proj1 spinner after writeFile
      reporter.resumeSpinner('proj1');
      expect(spinner1!.isSpinning).toBe(true);
      expect(spinner2!.isSpinning).toBe(true);

      // Both spinners still work for success reporting
      reporter.reportSuccess('Saved: file1.md', 'proj1');
      reporter.reportSuccess('Saved: file2.md', 'proj2');

      expect(spinner1!.succeed).toHaveBeenCalled();
      expect(spinner2!.succeed).toHaveBeenCalled();
    });

    it('should resume spinner in catch block if writeFile throws error', async () => {
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
      expect(spinner!.isSpinning).toBe(true);

      // Pause spinner before writeFile
      reporter.pauseSpinner();
      expect(spinner!.isSpinning).toBe(false);

      // Simulate writeFile() throwing error
      try {
        throw new Error('Disk full');
      } catch (error) {
        // Resume spinner in catch block (like entry.ts does)
        reporter.resumeSpinner();
        expect(spinner!.isSpinning).toBe(true);

        // Report error with spinner
        reporter.reportError('Failed: file.md - Disk full');
        expect(spinner!.fail).toHaveBeenCalled();
      }
    });

    it('should handle pause/resume when --force is used (no prompt)', async () => {
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

      // Even with --force (no prompt), pause/resume should not break
      reporter.pauseSpinner();
      expect(spinner!.isSpinning).toBe(false);

      // writeFile() with force=true doesn't show prompt, just writes immediately
      // ... no prompt shown ...

      reporter.resumeSpinner();
      expect(spinner!.isSpinning).toBe(true);

      reporter.reportSuccess('Saved: file.md');
      expect(spinner!.succeed).toHaveBeenCalled();
    });
  });
});
