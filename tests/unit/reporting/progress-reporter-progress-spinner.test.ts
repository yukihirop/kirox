/**
 * ProgressReporter Progress with Spinner Tests
 *
 * Tests for Task 3.1 & 3.2: reportProgress メソッドをスピナーベースに移行
 *
 * Task 3.1: シングルプロジェクトモードのスピナー進捗表示
 * - プロジェクト名なし (デフォルトスピナー) の場合のスピナー取得または生成
 * - スピナー未開始時に進捗テキストでスピナーを開始
 * - スピナー動作中の場合は .text プロパティで進捗テキストを更新
 * - フォールバックモード時は既存のconsole.log実装を使用
 *
 * Task 3.2: マルチプロジェクトモードのスピナー管理
 * - プロジェクト名をキーとしてスピナーをMapから取得または新規作成
 * - プロジェクト名プレフィックス付きの進捗テキストフォーマット
 * - 各プロジェクトのスピナーが独立して動作
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { Ora } from 'ora';

// Mock ora module
const mockSpinnerInstances: Map<string, ReturnType<typeof createMockSpinner>> = new Map();

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

  // Make start() set isSpinning to true and return this
  spinner.start.mockImplementation(() => {
    spinner.isSpinning = true;
    return spinner;
  });

  // Make stop() set isSpinning to false and return this
  spinner.stop.mockImplementation(() => {
    spinner.isSpinning = false;
    return spinner;
  });

  spinner.succeed.mockReturnValue(spinner);
  spinner.fail.mockReturnValue(spinner);

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

describe('ProgressReporter - reportProgress with Spinner (Task 3.1 & 3.2)', () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSpinnerInstances.clear();
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Task 3.1: Single project mode (no projectName)', () => {
    it('should create default spinner on first reportProgress call', async () => {
      const { ProgressReporter } = await import(
        '../../../src/reporting/progress-reporter.js'
      );
      const reporter = new ProgressReporter({ verbose: false, useColor: true });

      // Access private spinnerMap
      const reporterAny = reporter as unknown as {
        spinnerMap: Map<string, Ora>;
      };

      // Initially, spinnerMap should be empty
      expect(reporterAny.spinnerMap.size).toBe(0);

      // Call reportProgress without projectName
      reporter.reportProgress(1, 10, 'file1.md');

      // Should have created a default spinner with key ''
      expect(reporterAny.spinnerMap.size).toBe(1);
      expect(reporterAny.spinnerMap.has('')).toBe(true);
    });

    it('should start spinner with progress text on first call', async () => {
      const ora = (await import('ora')).default;
      const { ProgressReporter } = await import(
        '../../../src/reporting/progress-reporter.js'
      );
      const reporter = new ProgressReporter({ verbose: false, useColor: true });

      reporter.reportProgress(1, 10, 'file1.md');

      // ora should have been called to create a spinner
      expect(ora).toHaveBeenCalled();

      // The created spinner should have .start() called
      const lastCall = vi.mocked(ora).mock.results[vi.mocked(ora).mock.results.length - 1];
      const spinner = lastCall?.value as ReturnType<typeof createMockSpinner>;
      expect(spinner.start).toHaveBeenCalled();
    });

    it('should update spinner.text on subsequent calls', async () => {
      const ora = (await import('ora')).default;
      const { ProgressReporter } = await import(
        '../../../src/reporting/progress-reporter.js'
      );
      const reporter = new ProgressReporter({ verbose: false, useColor: true });

      // First call - creates and starts spinner
      reporter.reportProgress(1, 10, 'file1.md');

      const firstCallResult = vi.mocked(ora).mock.results[vi.mocked(ora).mock.results.length - 1];
      const spinner = firstCallResult?.value as ReturnType<typeof createMockSpinner>;

      // Second call - should update text instead of creating new spinner
      reporter.reportProgress(2, 10, 'file2.md');

      // Should still have only one spinner in map
      const reporterAny = reporter as unknown as {
        spinnerMap: Map<string, Ora>;
      };
      expect(reporterAny.spinnerMap.size).toBe(1);

      // Spinner text should be updated
      expect(spinner.text).toContain('[2/10]');
      expect(spinner.text).toContain('file2.md');
    });

    it('should use fallback console.log when useFallback=true', async () => {
      // This test was already covered in progress-reporter-fallback.test.ts
      // We'll test the reportProgress fallback path here

      // Access private useFallback to simulate fallback mode
      const { ProgressReporter } = await import(
        '../../../src/reporting/progress-reporter.js'
      );
      const reporter = new ProgressReporter({ verbose: false, useColor: true });

      // Force useFallback to true for testing
      const reporterAny = reporter as unknown as {
        useFallback: boolean;
      };
      reporterAny.useFallback = true;

      // reportProgress should fall back to console.log
      reporter.reportProgress(1, 10, 'file1.md');

      // Should have called console.log instead of spinner
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('[1/10]'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('file1.md'));
    });

    it('should format progress text correctly without project name', async () => {
      const { ProgressReporter } = await import(
        '../../../src/reporting/progress-reporter.js'
      );
      const reporter = new ProgressReporter({ verbose: false, useColor: true });

      reporter.reportProgress(3, 10, '.kiro/specs/project/file.md');

      const reporterAny = reporter as unknown as {
        spinnerMap: Map<string, Ora>;
      };

      const spinner = reporterAny.spinnerMap.get('');
      expect(spinner).toBeDefined();

      // Should format as: [3/10] 📥 Fetching .kiro/specs/project/file.md...
      expect(spinner!.text).toContain('[3/10]');
      expect(spinner!.text).toContain('📥');
      expect(spinner!.text).toContain('Fetching');
      expect(spinner!.text).toContain('.kiro/specs/project/file.md');
      expect(spinner!.text).not.toContain('[proj'); // No project prefix
    });
  });

  describe('Task 3.2: Multi-project mode (with projectName)', () => {
    it('should create project-specific spinner on first call', async () => {
      const { ProgressReporter } = await import(
        '../../../src/reporting/progress-reporter.js'
      );
      const reporter = new ProgressReporter({ verbose: false, useColor: true });

      const reporterAny = reporter as unknown as {
        spinnerMap: Map<string, Ora>;
      };

      // Initially empty
      expect(reporterAny.spinnerMap.size).toBe(0);

      // Call with project name
      reporter.reportProgress(1, 8, 'file1.md', 'proj1');

      // Should have created spinner with key 'proj1'
      expect(reporterAny.spinnerMap.size).toBe(1);
      expect(reporterAny.spinnerMap.has('proj1')).toBe(true);
    });

    it('should format progress text with project name prefix', async () => {
      const { ProgressReporter } = await import(
        '../../../src/reporting/progress-reporter.js'
      );
      const reporter = new ProgressReporter({ verbose: false, useColor: true });

      reporter.reportProgress(3, 10, 'file.md', 'proj1');

      const reporterAny = reporter as unknown as {
        spinnerMap: Map<string, Ora>;
      };

      const spinner = reporterAny.spinnerMap.get('proj1');
      expect(spinner).toBeDefined();

      // Should format as: [proj1] [3/10] 📥 Fetching file.md...
      expect(spinner!.text).toContain('[proj1]');
      expect(spinner!.text).toContain('[3/10]');
      expect(spinner!.text).toContain('📥');
      expect(spinner!.text).toContain('Fetching');
      expect(spinner!.text).toContain('file.md');
    });

    it('should manage independent spinners for different projects', async () => {
      const { ProgressReporter } = await import(
        '../../../src/reporting/progress-reporter.js'
      );
      const reporter = new ProgressReporter({ verbose: false, useColor: true });

      // Create spinner for proj1
      reporter.reportProgress(1, 8, 'file1.md', 'proj1');

      // Create spinner for proj2
      reporter.reportProgress(1, 5, 'file2.md', 'proj2');

      const reporterAny = reporter as unknown as {
        spinnerMap: Map<string, Ora>;
      };

      // Should have two independent spinners
      expect(reporterAny.spinnerMap.size).toBe(2);
      expect(reporterAny.spinnerMap.has('proj1')).toBe(true);
      expect(reporterAny.spinnerMap.has('proj2')).toBe(true);

      // Each spinner should have been started
      const spinner1 = reporterAny.spinnerMap.get('proj1');
      const spinner2 = reporterAny.spinnerMap.get('proj2');
      expect(spinner1).toBeDefined();
      expect(spinner2).toBeDefined();
      expect(spinner1!.isSpinning).toBe(true);
      expect(spinner2!.isSpinning).toBe(true);
    });

    it('should update correct spinner when called with same project', async () => {
      const { ProgressReporter } = await import(
        '../../../src/reporting/progress-reporter.js'
      );
      const reporter = new ProgressReporter({ verbose: false, useColor: true });

      // First call for proj1
      reporter.reportProgress(1, 8, 'file1.md', 'proj1');

      const reporterAny = reporter as unknown as {
        spinnerMap: Map<string, Ora>;
      };

      const spinner1 = reporterAny.spinnerMap.get('proj1');
      expect(spinner1).toBeDefined();

      // Second call for proj1
      reporter.reportProgress(2, 8, 'file2.md', 'proj1');

      // Should still have only one spinner for proj1
      expect(reporterAny.spinnerMap.size).toBe(1);

      // Spinner text should be updated
      expect(spinner1!.text).toContain('[proj1]');
      expect(spinner1!.text).toContain('[2/8]');
      expect(spinner1!.text).toContain('file2.md');
    });

    it('should handle empty project name as default spinner', async () => {
      const { ProgressReporter } = await import(
        '../../../src/reporting/progress-reporter.js'
      );
      const reporter = new ProgressReporter({ verbose: false, useColor: true });

      const reporterAny = reporter as unknown as {
        spinnerMap: Map<string, Ora>;
      };

      // Call with empty string project name
      reporter.reportProgress(1, 10, 'file1.md', '');

      // Should use default spinner key ''
      expect(reporterAny.spinnerMap.size).toBe(1);
      expect(reporterAny.spinnerMap.has('')).toBe(true);
    });

    it('should handle whitespace-only project name as default spinner', async () => {
      const { ProgressReporter } = await import(
        '../../../src/reporting/progress-reporter.js'
      );
      const reporter = new ProgressReporter({ verbose: false, useColor: true });

      const reporterAny = reporter as unknown as {
        spinnerMap: Map<string, Ora>;
      };

      // Call with whitespace-only project name
      reporter.reportProgress(1, 10, 'file1.md', '   ');

      // Should use default spinner key ''
      expect(reporterAny.spinnerMap.size).toBe(1);
      expect(reporterAny.spinnerMap.has('')).toBe(true);
    });
  });

  describe('Edge cases and integration', () => {
    it('should handle mixed single and multi-project calls', async () => {
      const { ProgressReporter } = await import(
        '../../../src/reporting/progress-reporter.js'
      );
      const reporter = new ProgressReporter({ verbose: false, useColor: true });

      const reporterAny = reporter as unknown as {
        spinnerMap: Map<string, Ora>;
      };

      // Single project call (no name)
      reporter.reportProgress(1, 10, 'file1.md');

      // Multi-project call
      reporter.reportProgress(1, 8, 'file2.md', 'proj1');

      // Another single project call
      reporter.reportProgress(2, 10, 'file3.md');

      // Should have two spinners: '' and 'proj1'
      expect(reporterAny.spinnerMap.size).toBe(2);
      expect(reporterAny.spinnerMap.has('')).toBe(true);
      expect(reporterAny.spinnerMap.has('proj1')).toBe(true);
    });

    it('should strip subdirectory prefix from file paths in spinner text', async () => {
      const { ProgressReporter } = await import(
        '../../../src/reporting/progress-reporter.js'
      );
      const reporter = new ProgressReporter({ verbose: false, useColor: true });

      reporter.reportProgress(1, 8, 'lib/a/.kiro/specs/project/file.md');

      const reporterAny = reporter as unknown as {
        spinnerMap: Map<string, Ora>;
      };

      const spinner = reporterAny.spinnerMap.get('');
      expect(spinner).toBeDefined();

      // Should strip 'lib/a/' prefix
      expect(spinner!.text).toContain('.kiro/specs/project/file.md');
      expect(spinner!.text).not.toContain('lib/a/');
    });
  });
});
