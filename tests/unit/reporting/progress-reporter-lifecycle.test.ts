/**
 * ProgressReporter Spinner Lifecycle Tests
 *
 * Tests for Task 5.1 & 5.2: スピナーのライフサイクル管理機能
 *
 * Task 5.1: reportProjectSummary メソッドでスピナーをクリーンアップ
 * - プロジェクト完了時に該当スピナーをMapから削除
 * - スピナーが動作中の場合は停止してから削除
 * - プロジェクトサマリーメッセージをconsole.logで出力
 *
 * Task 5.2: reportSummary と reportOverallSummary でスピナー停止を保証
 * - すべてのアクティブなスピナーを停止してからサマリー表示
 * - Map内の全スピナーをクリア
 * - サマリー情報をconsole.logで出力
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

  spinner.start.mockImplementation(() => {
    spinner.isSpinning = true;
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

describe('ProgressReporter - Spinner Lifecycle (Task 5.1 & 5.2)', () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Task 5.1: reportProjectSummary lifecycle management', () => {
    it('should remove spinner from map when project completes', async () => {
      const { ProgressReporter } = await import(
        '../../../src/reporting/progress-reporter.js'
      );
      const reporter = new ProgressReporter({ verbose: false, useColor: true });

      // Create project-specific spinner
      reporter.reportProgress(1, 10, 'file.md', 'proj1');

      const reporterAny = reporter as unknown as {
        spinnerMap: Map<string, Ora>;
      };

      // Should have spinner for proj1
      expect(reporterAny.spinnerMap.size).toBe(1);
      expect(reporterAny.spinnerMap.has('proj1')).toBe(true);

      // Call reportProjectSummary
      reporter.reportProjectSummary('proj1', 8, 2);

      // Should have removed spinner from map
      expect(reporterAny.spinnerMap.has('proj1')).toBe(false);
      expect(reporterAny.spinnerMap.size).toBe(0);
    });

    it('should stop spinner before removing if still spinning', async () => {
      const { ProgressReporter } = await import(
        '../../../src/reporting/progress-reporter.js'
      );
      const reporter = new ProgressReporter({ verbose: false, useColor: true });

      // Create and start spinner
      reporter.reportProgress(1, 10, 'file.md', 'proj1');

      const reporterAny = reporter as unknown as {
        spinnerMap: Map<string, Ora>;
      };

      const spinner = reporterAny.spinnerMap.get('proj1');
      expect(spinner).toBeDefined();
      expect(spinner!.isSpinning).toBe(true);

      // Call reportProjectSummary
      reporter.reportProjectSummary('proj1', 10, 0);

      // Spinner should have been stopped
      expect(spinner!.stop).toHaveBeenCalled();
    });

    it('should output project summary message to console.log', async () => {
      const { ProgressReporter } = await import(
        '../../../src/reporting/progress-reporter.js'
      );
      const reporter = new ProgressReporter({ verbose: false, useColor: true });

      // Create spinner
      reporter.reportProgress(1, 10, 'file.md', 'proj1');

      // Call reportProjectSummary
      reporter.reportProjectSummary('proj1', 8, 2);

      // Should have logged summary message
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('[proj1]')
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('8 files succeeded')
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('2 files failed')
      );
    });

    it('should handle default spinner (empty project name)', async () => {
      const { ProgressReporter } = await import(
        '../../../src/reporting/progress-reporter.js'
      );
      const reporter = new ProgressReporter({ verbose: false, useColor: true });

      // Create default spinner
      reporter.reportProgress(1, 10, 'file.md');

      const reporterAny = reporter as unknown as {
        spinnerMap: Map<string, Ora>;
      };

      expect(reporterAny.spinnerMap.has('')).toBe(true);

      // Call reportProjectSummary with empty project name
      // Note: reportProjectSummary currently requires a project name,
      // so this tests the edge case
      reporter.reportProjectSummary('', 10, 0);

      // Default spinner should be removed
      expect(reporterAny.spinnerMap.has('')).toBe(false);
    });

    it('should not crash if spinner does not exist', async () => {
      const { ProgressReporter } = await import(
        '../../../src/reporting/progress-reporter.js'
      );
      const reporter = new ProgressReporter({ verbose: false, useColor: true });

      // Call reportProjectSummary without creating spinner first
      expect(() => {
        reporter.reportProjectSummary('nonexistent', 5, 0);
      }).not.toThrow();

      // Should still log summary
      expect(consoleLogSpy).toHaveBeenCalled();
    });
  });

  describe('Task 5.2: reportSummary/reportOverallSummary lifecycle', () => {
    it('should stop all active spinners before displaying summary', async () => {
      const { ProgressReporter } = await import(
        '../../../src/reporting/progress-reporter.js'
      );
      const reporter = new ProgressReporter({ verbose: false, useColor: true });

      // Create multiple spinners
      reporter.reportProgress(1, 10, 'file1.md', 'proj1');
      reporter.reportProgress(1, 8, 'file2.md', 'proj2');
      reporter.reportProgress(1, 5, 'file3.md', 'proj3');

      const reporterAny = reporter as unknown as {
        spinnerMap: Map<string, Ora>;
      };

      const spinner1 = reporterAny.spinnerMap.get('proj1');
      const spinner2 = reporterAny.spinnerMap.get('proj2');
      const spinner3 = reporterAny.spinnerMap.get('proj3');

      expect(reporterAny.spinnerMap.size).toBe(3);

      // Call reportSummary
      reporter.reportSummary(20, 3);

      // All spinners should have been stopped
      expect(spinner1!.stop).toHaveBeenCalled();
      expect(spinner2!.stop).toHaveBeenCalled();
      expect(spinner3!.stop).toHaveBeenCalled();
    });

    it('should clear spinner map after stopping all spinners', async () => {
      const { ProgressReporter } = await import(
        '../../../src/reporting/progress-reporter.js'
      );
      const reporter = new ProgressReporter({ verbose: false, useColor: true });

      // Create spinners
      reporter.reportProgress(1, 10, 'file1.md', 'proj1');
      reporter.reportProgress(1, 8, 'file2.md', 'proj2');

      const reporterAny = reporter as unknown as {
        spinnerMap: Map<string, Ora>;
      };

      expect(reporterAny.spinnerMap.size).toBe(2);

      // Call reportSummary
      reporter.reportSummary(15, 3);

      // Map should be cleared
      expect(reporterAny.spinnerMap.size).toBe(0);
    });

    it('should output summary info to console.log', async () => {
      const { ProgressReporter } = await import(
        '../../../src/reporting/progress-reporter.js'
      );
      const reporter = new ProgressReporter({ verbose: false, useColor: true });

      // Create spinner
      reporter.reportProgress(1, 10, 'file.md');

      // Call reportSummary
      reporter.reportSummary(8, 2);

      // Should have logged summary
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Summary:')
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('8 files succeeded')
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('2 files failed')
      );
    });

    it('should stop all spinners in reportOverallSummary', async () => {
      const { ProgressReporter } = await import(
        '../../../src/reporting/progress-reporter.js'
      );
      const reporter = new ProgressReporter({ verbose: false, useColor: true });

      // Create multiple spinners
      reporter.reportProgress(1, 10, 'file1.md', 'proj1');
      reporter.reportProgress(1, 8, 'file2.md', 'proj2');

      const reporterAny = reporter as unknown as {
        spinnerMap: Map<string, Ora>;
      };

      const spinner1 = reporterAny.spinnerMap.get('proj1');
      const spinner2 = reporterAny.spinnerMap.get('proj2');

      // Call reportOverallSummary
      reporter.reportOverallSummary(2, 18, 0);

      // All spinners should have been stopped
      expect(spinner1!.stop).toHaveBeenCalled();
      expect(spinner2!.stop).toHaveBeenCalled();
    });

    it('should clear spinner map in reportOverallSummary', async () => {
      const { ProgressReporter } = await import(
        '../../../src/reporting/progress-reporter.js'
      );
      const reporter = new ProgressReporter({ verbose: false, useColor: true });

      // Create spinners
      reporter.reportProgress(1, 10, 'file1.md', 'proj1');
      reporter.reportProgress(1, 8, 'file2.md', 'proj2');

      const reporterAny = reporter as unknown as {
        spinnerMap: Map<string, Ora>;
      };

      expect(reporterAny.spinnerMap.size).toBe(2);

      // Call reportOverallSummary
      reporter.reportOverallSummary(2, 18, 0);

      // Map should be cleared
      expect(reporterAny.spinnerMap.size).toBe(0);
    });

    it('should output overall summary to console.log', async () => {
      const { ProgressReporter } = await import(
        '../../../src/reporting/progress-reporter.js'
      );
      const reporter = new ProgressReporter({ verbose: false, useColor: true });

      // Create spinner
      reporter.reportProgress(1, 10, 'file.md', 'proj1');

      // Call reportOverallSummary
      reporter.reportOverallSummary(3, 24, 3);

      // Should have logged summary
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Overall Summary')
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Projects: 3')
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Succeeded: 24 files')
      );
    });
  });

  describe('Edge cases', () => {
    it('should handle empty spinner map in reportSummary', async () => {
      const { ProgressReporter } = await import(
        '../../../src/reporting/progress-reporter.js'
      );
      const reporter = new ProgressReporter({ verbose: false, useColor: true });

      // Call reportSummary without creating any spinners
      expect(() => {
        reporter.reportSummary(0, 0);
      }).not.toThrow();

      // Should still output summary
      expect(consoleLogSpy).toHaveBeenCalled();
    });

    it('should handle mixed spinning and stopped spinners', async () => {
      const { ProgressReporter } = await import(
        '../../../src/reporting/progress-reporter.js'
      );
      const reporter = new ProgressReporter({ verbose: false, useColor: true });

      // Create spinners
      reporter.reportProgress(1, 10, 'file1.md', 'proj1');
      reporter.reportProgress(1, 8, 'file2.md', 'proj2');

      const reporterAny = reporter as unknown as {
        spinnerMap: Map<string, Ora>;
      };

      const spinner2 = reporterAny.spinnerMap.get('proj2');
      expect(spinner2!.isSpinning).toBe(true);

      // Stop one spinner manually (Task 14.4: this removes spinner1 from map)
      reporter.reportSuccess('Done', 'proj1');

      const spinner1AfterSuccess = reporterAny.spinnerMap.get('proj1');
      expect(spinner1AfterSuccess).toBeUndefined(); // Task 14.4: spinner removed after succeed

      // spinner2 should still be spinning
      expect(spinner2!.isSpinning).toBe(true);

      // Call reportSummary
      reporter.reportSummary(10, 0);

      // spinner2 should be stopped
      expect(spinner2!.stop).toHaveBeenCalled();
    });
  });
});
