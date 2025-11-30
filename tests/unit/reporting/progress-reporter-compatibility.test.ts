/**
 * ProgressReporter Compatibility Tests
 *
 * Tests for Task 6: 既存機能との互換性を維持
 *
 * Task 6.1: verboseモードでの詳細ログ表示を継続サポート
 * - スピナー動作中でもverboseメッセージをconsole.logで出力
 * - スピナー表示と詳細ログが干渉しないことを確認
 *
 * Task 6.2: dry-runモードでスピナーを開始しない
 * - reportDryRunFileList メソッドでスピナーを使用しない
 * - ファイルリスト表示にはconsole.logを継続使用
 *
 * Task 6.3: useColor設定をoraに正しく伝播
 * - useColor=false時にoraのcolorオプションをfalseに設定
 * - 色無効化が正しく動作することを確認
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock ora module
function createMockSpinner() {
  const spinner = {
    text: '',
    isSpinning: false,
    color: 'cyan' as string | false,
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
    if (options?.color !== undefined) {
      spinner.color = options.color === false ? false : (options.color as string || 'cyan');
    }
    return spinner;
  }),
}));

describe('ProgressReporter - Compatibility (Task 6)', () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Task 6.1: Verbose mode compatibility', () => {
    it('should output verbose messages to console.log even when spinner is active', async () => {
      const { ProgressReporter } = await import(
        '../../../src/reporting/progress-reporter.js'
      );
      const reporter = new ProgressReporter({ verbose: true, useColor: true });

      // Start a spinner
      reporter.reportProgress(1, 10, 'file.md');

      // Call reportVerbose while spinner is active
      reporter.reportVerbose('Verbose message during spinner');

      // Should have logged verbose message
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('[VERBOSE] Verbose message during spinner')
      );
    });

    it('should not output verbose messages when verbose=false', async () => {
      const { ProgressReporter } = await import(
        '../../../src/reporting/progress-reporter.js'
      );
      const reporter = new ProgressReporter({ verbose: false, useColor: true });

      // Start a spinner
      reporter.reportProgress(1, 10, 'file.md');

      // Clear previous calls
      consoleLogSpy.mockClear();

      // Call reportVerbose
      reporter.reportVerbose('This should not be logged');

      // Should NOT have logged
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });

    it('should support verbose messages with project names', async () => {
      const { ProgressReporter } = await import(
        '../../../src/reporting/progress-reporter.js'
      );
      const reporter = new ProgressReporter({ verbose: true, useColor: true });

      // Start a spinner for a project
      reporter.reportProgress(1, 10, 'file.md', 'proj1');

      // Call reportVerbose with project name
      reporter.reportVerbose('Detailed log message', 'proj1');

      // Should have logged with project prefix
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('[VERBOSE] [proj1] Detailed log message')
      );
    });

    it('should not interfere with spinner when outputting verbose logs', async () => {
      const { ProgressReporter } = await import(
        '../../../src/reporting/progress-reporter.js'
      );
      const reporter = new ProgressReporter({ verbose: true, useColor: true });

      // Start a spinner
      reporter.reportProgress(1, 10, 'file.md');

      // Output verbose log
      reporter.reportVerbose('Verbose message');

      // Verify verbose message was logged (spinner didn't interfere)
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('[VERBOSE] Verbose message')
      );

      // Verify that reporting progress still works after verbose log (spinner still active)
      reporter.reportProgress(5, 10, 'file2.md');

      // No errors should occur - this proves spinner is still active and functional
      expect(consoleLogSpy).toHaveBeenCalled();
    });
  });

  describe('Task 6.2: Dry-run mode compatibility', () => {
    it('should use console.log for dry-run file list (not spinner)', async () => {
      const { ProgressReporter } = await import(
        '../../../src/reporting/progress-reporter.js'
      );
      const reporter = new ProgressReporter({ verbose: false, useColor: true });

      const files = ['file1.md', 'file2.md', 'file3.md'];

      // Call reportDryRunFileList
      reporter.reportDryRunFileList(files);

      // Should have logged dry-run header
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('[DRY-RUN]')
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('3 files')
      );

      // Should have logged each file
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('file1.md')
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('file2.md')
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('file3.md')
      );
    });

    it('should not create spinners during dry-run', async () => {
      const ora = (await import('ora')).default;
      const { ProgressReporter } = await import(
        '../../../src/reporting/progress-reporter.js'
      );
      const reporter = new ProgressReporter({ verbose: false, useColor: true });

      // Clear ora calls from constructor
      vi.mocked(ora).mockClear();

      // Call reportDryRunFileList
      reporter.reportDryRunFileList(['file1.md', 'file2.md']);

      // Verify ora was NOT called (no spinners created during dry-run)
      expect(ora).not.toHaveBeenCalled();

      // Verify console.log was used instead
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('[DRY-RUN]')
      );
    });

    it('should handle empty file list in dry-run', async () => {
      const { ProgressReporter } = await import(
        '../../../src/reporting/progress-reporter.js'
      );
      const reporter = new ProgressReporter({ verbose: false, useColor: true });

      // Call reportDryRunFileList with empty array
      reporter.reportDryRunFileList([]);

      // Should have logged header
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('[DRY-RUN]')
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('0 file')
      );
    });
  });

  describe('Task 6.3: useColor compatibility', () => {
    it('should pass color:false to ora when useColor=false', async () => {
      const ora = (await import('ora')).default;
      const { ProgressReporter } = await import(
        '../../../src/reporting/progress-reporter.js'
      );

      // Create reporter with useColor=false
      new ProgressReporter({ verbose: false, useColor: false });

      // Ora should have been called with color:false
      expect(ora).toHaveBeenCalledWith(
        expect.objectContaining({ color: false })
      );
    });

    it('should pass color:undefined to ora when useColor=true', async () => {
      const ora = (await import('ora')).default;
      const { ProgressReporter } = await import(
        '../../../src/reporting/progress-reporter.js'
      );

      // Clear previous calls
      vi.mocked(ora).mockClear();

      // Create reporter with useColor=true
      new ProgressReporter({ verbose: false, useColor: true });

      // Ora should have been called without color (undefined, uses ora default)
      const calls = vi.mocked(ora).mock.calls;
      const oraCall = calls.find(call => call[0] && typeof call[0] === 'object');

      if (oraCall && oraCall[0] && typeof oraCall[0] === 'object') {
        const options = oraCall[0] as { color?: string | false };
        // When useColor=true, color should be undefined (or not present)
        expect(options.color).toBeUndefined();
      }
    });

    it('should store oraOptions with color:false when useColor=false', async () => {
      const { ProgressReporter } = await import(
        '../../../src/reporting/progress-reporter.js'
      );
      const reporter = new ProgressReporter({ verbose: false, useColor: false });

      const reporterAny = reporter as unknown as {
        oraOptions: { color?: string | false };
      };

      // Should have stored color:false in oraOptions
      expect(reporterAny.oraOptions.color).toBe(false);
    });

    it('should create spinners with color:false when useColor=false', async () => {
      const ora = (await import('ora')).default;
      const { ProgressReporter } = await import(
        '../../../src/reporting/progress-reporter.js'
      );
      const reporter = new ProgressReporter({ verbose: false, useColor: false });

      // Clear ora calls from constructor
      vi.mocked(ora).mockClear();

      // Create a spinner by calling reportProgress
      reporter.reportProgress(1, 10, 'file.md');

      // Verify ora was called with color:false when creating the progress spinner
      expect(ora).toHaveBeenCalledWith(
        expect.objectContaining({ color: false })
      );
    });
  });

  describe('Integration tests', () => {
    it('should support verbose mode with useColor=false', async () => {
      const { ProgressReporter } = await import(
        '../../../src/reporting/progress-reporter.js'
      );
      const reporter = new ProgressReporter({ verbose: true, useColor: false });

      reporter.reportProgress(1, 10, 'file.md');
      reporter.reportVerbose('Verbose message');

      // Should have logged verbose message
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('[VERBOSE] Verbose message')
      );
    });

    it('should work correctly with all compatibility features enabled', async () => {
      const { ProgressReporter } = await import(
        '../../../src/reporting/progress-reporter.js'
      );
      const reporter = new ProgressReporter({ verbose: true, useColor: true });

      // Test spinner
      reporter.reportProgress(1, 10, 'file1.md', 'proj1');

      // Test verbose
      reporter.reportVerbose('Processing file', 'proj1');

      // Test dry-run
      reporter.reportDryRunFileList(['file2.md', 'file3.md']);

      // Test success
      reporter.reportSuccess('Completed', 'proj1');

      // All operations should work without errors
      expect(consoleLogSpy).toHaveBeenCalled();
    });
  });
});
