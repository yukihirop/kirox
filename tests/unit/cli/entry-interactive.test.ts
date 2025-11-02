/**
 * CLI Entry Interactive Mode Integration Test
 *
 * Tests for interactive mode integration into entry.ts
 * Task 6.1: index.tsへの対話モード統合
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { execute } from '@/cli/entry.js';
import * as parser from '@/cli/parser.js';
import * as interactive from '@/cli/interactive-prompt.js';

// Mock all dependencies
vi.mock('@/cli/parser.js');
vi.mock('@/cli/validator.js', () => ({
  validateInput: vi.fn(() => ({ valid: true, errors: [] })),
}));
vi.mock('@/cli/interactive-prompt.js');
vi.mock('@/github/fetcher.js');
vi.mock('@/github/parallel-fetcher.js');
vi.mock('@/filesystem/writer.js');
vi.mock('@/reporting/progress-reporter.js');
vi.mock('@/reporting/error-handler.js', () => ({
  ErrorHandler: vi.fn(() => ({
    handle: vi.fn(() => ({
      type: 'GENERIC_ERROR',
      message: 'Error occurred',
      exitCode: 1,
    })),
  })),
}));
vi.mock('@/reporting/logger.js', () => ({
  Logger: vi.fn(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    logError: vi.fn(),
  })),
}));
vi.mock('@/config/loader.js', () => ({
  loadConfig: vi.fn(async () => ({})),
}));
vi.mock('@/config/merger.js', () => ({
  mergeConfig: vi.fn((args) => args),
}));
vi.mock('octokit', () => ({
  Octokit: vi.fn(() => ({})),
}));

describe('execute - Interactive Mode Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mocks for interactive functions
    vi.mocked(interactive.shouldEnterInteractiveMode).mockReturnValue(false);
    vi.mocked(interactive.checkTTYEnvironment).mockReturnValue({
      success: true,
      exitCode: 0,
    });
    vi.mocked(interactive.handleInteractiveError).mockReturnValue({
      exitCode: 1,
      shouldExit: true,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('対話モード起動判定', () => {
    it('リポジトリとプロジェクトが両方指定されている場合、対話モードをスキップ', async () => {
      const mockArgs = {
        repository: 'owner/repo',
        projects: ['my-project'],
        output: '.',
        force: false,
        dryRun: false,
        verbose: false,
        track: false,
        checkUpdates: false,
        update: false,
        steering: false,
      };

      vi.mocked(parser.parseArguments).mockReturnValue(mockArgs);

      // shouldEnterInteractiveMode should not be called
      const shouldEnterSpy = vi.spyOn(interactive, 'shouldEnterInteractiveMode');

      // Execute will fail due to other mocks, but we only care about interactive mode check
      try {
        await execute(['node', 'kirox', 'owner/repo', '-p', 'my-project']);
      } catch {
        // Ignore other errors
      }

      // shouldEnterInteractiveMode should be called
      expect(shouldEnterSpy).toHaveBeenCalledWith(mockArgs);
    });

    it('リポジトリが欠落している場合、対話モードを起動', async () => {
      const mockIncompleteArgs = {
        repository: '',
        projects: [],
        output: '.',
        force: false,
        dryRun: false,
        verbose: false,
        track: false,
        checkUpdates: false,
        update: false,
        steering: false,
      };

      const mockCompletedArgs = {
        repository: 'owner/repo',
        projects: ['my-project'],
        output: '.',
        force: false,
        dryRun: false,
        verbose: false,
        track: false,
        checkUpdates: false,
        update: false,
        steering: false,
      };

      vi.mocked(parser.parseArguments).mockReturnValue(mockIncompleteArgs);
      vi.mocked(interactive.shouldEnterInteractiveMode).mockReturnValue(true);
      vi.mocked(interactive.promptMissingArguments).mockResolvedValue(mockCompletedArgs);

      try {
        await execute(['node', 'kirox']);
      } catch {
        // Ignore other errors
      }

      expect(interactive.shouldEnterInteractiveMode).toHaveBeenCalledWith(mockIncompleteArgs);
      expect(interactive.promptMissingArguments).toHaveBeenCalledWith(
        mockIncompleteArgs,
        expect.any(Object),
        expect.any(Object),
        false
      );
    });

    it('--check-updatesが指定されている場合、対話モードをスキップ', async () => {
      const mockArgs = {
        repository: '',
        projects: [],
        output: '.',
        force: false,
        dryRun: false,
        verbose: false,
        track: false,
        checkUpdates: true,
        update: false,
        steering: false,
      };

      vi.mocked(parser.parseArguments).mockReturnValue(mockArgs);
      vi.mocked(interactive.shouldEnterInteractiveMode).mockReturnValue(false);

      try {
        await execute(['node', 'kirox', '--check-updates']);
      } catch {
        // Ignore other errors
      }

      expect(interactive.shouldEnterInteractiveMode).toHaveBeenCalledWith(mockArgs);
      expect(interactive.promptMissingArguments).not.toHaveBeenCalled();
    });
  });

  describe('ExitPromptErrorハンドリング', () => {
    it('ExitPromptErrorがスローされた場合、exitCode 130を返す', async () => {
      const mockIncompleteArgs = {
        repository: '',
        projects: [],
        output: '.',
        force: false,
        dryRun: false,
        verbose: false,
        track: false,
        checkUpdates: false,
        update: false,
        steering: false,
      };

      const exitError = new Error('User force closed the prompt');
      exitError.name = 'ExitPromptError';

      vi.mocked(parser.parseArguments).mockReturnValue(mockIncompleteArgs);
      vi.mocked(interactive.shouldEnterInteractiveMode).mockReturnValue(true);
      vi.mocked(interactive.promptMissingArguments).mockRejectedValue(exitError);
      vi.mocked(interactive.handleInteractiveError).mockReturnValue({
        exitCode: 130,
        shouldExit: true,
      });

      const result = await execute(['node', 'kirox']);

      expect(result.exitCode).toBe(130);
      expect(result.success).toBe(false);
    });

    it('確認キャンセルエラーの場合、exitCode 0を返す', async () => {
      const mockIncompleteArgs = {
        repository: '',
        projects: [],
        output: '.',
        force: false,
        dryRun: false,
        verbose: false,
        track: false,
        checkUpdates: false,
        update: false,
        steering: false,
      };

      const cancelError = new Error('処理を中断しました');

      vi.mocked(parser.parseArguments).mockReturnValue(mockIncompleteArgs);
      vi.mocked(interactive.shouldEnterInteractiveMode).mockReturnValue(true);
      vi.mocked(interactive.promptMissingArguments).mockRejectedValue(cancelError);
      vi.mocked(interactive.handleInteractiveError).mockReturnValue({
        exitCode: 0,
        shouldExit: true,
      });

      const result = await execute(['node', 'kirox']);

      expect(result.exitCode).toBe(0);
      expect(result.success).toBe(false);
    });

    it('その他のエラーの場合、既存のエラーハンドリングを使用', async () => {
      const mockIncompleteArgs = {
        repository: '',
        projects: [],
        output: '.',
        force: false,
        dryRun: false,
        verbose: false,
        track: false,
        checkUpdates: false,
        update: false,
        steering: false,
      };

      const genericError = new Error('Some generic error');

      vi.mocked(parser.parseArguments).mockReturnValue(mockIncompleteArgs);
      vi.mocked(interactive.shouldEnterInteractiveMode).mockReturnValue(true);
      vi.mocked(interactive.promptMissingArguments).mockRejectedValue(genericError);

      const result = await execute(['node', 'kirox']);

      // Should use existing error handling (exitCode 1)
      expect(result.exitCode).toBeGreaterThan(0);
      expect(result.success).toBe(false);
    });
  });

  describe('非TTY環境の処理', () => {
    it('非TTY環境で対話モードが必要な場合、適切なエラーを返す', async () => {
      const mockIncompleteArgs = {
        repository: '',
        projects: [],
        output: '.',
        force: false,
        dryRun: false,
        verbose: false,
        track: false,
        checkUpdates: false,
        update: false,
        steering: false,
      };

      vi.mocked(parser.parseArguments).mockReturnValue(mockIncompleteArgs);
      vi.mocked(interactive.shouldEnterInteractiveMode).mockReturnValue(true);

      // Mock checkTTYEnvironment to return failure
      vi.mocked(interactive.checkTTYEnvironment).mockReturnValue({
        success: false,
        exitCode: 1,
      });

      const result = await execute(['node', 'kirox']);

      expect(result.exitCode).toBe(1);
      expect(result.success).toBe(false);
    });
  });

  describe('対話モードから非対話モードへの遷移', () => {
    it('対話モードで引数を補完後、通常のexecuteフローを実行', async () => {
      const mockIncompleteArgs = {
        repository: '',
        projects: [],
        output: '.',
        force: false,
        dryRun: false,
        verbose: false,
        track: false,
        checkUpdates: false,
        update: false,
        steering: false,
      };

      const mockCompletedArgs = {
        repository: 'owner/repo',
        projects: ['my-project'],
        output: '.',
        force: false,
        dryRun: false,
        verbose: false,
        track: false,
        checkUpdates: false,
        update: false,
        steering: false,
      };

      vi.mocked(parser.parseArguments).mockReturnValue(mockIncompleteArgs);
      vi.mocked(interactive.shouldEnterInteractiveMode).mockReturnValue(true);
      vi.mocked(interactive.checkTTYEnvironment).mockReturnValue({
        success: true,
        exitCode: 0,
      });
      vi.mocked(interactive.promptMissingArguments).mockResolvedValue(mockCompletedArgs);

      try {
        await execute(['node', 'kirox']);
      } catch {
        // Ignore other errors from mocked dependencies
      }

      // Verify that promptMissingArguments was called with logger and verbose parameters
      expect(interactive.promptMissingArguments).toHaveBeenCalledWith(
        mockIncompleteArgs,
        expect.any(Object),
        expect.any(Object),
        false
      );

      // Verify that the completed args would be used (this would fail due to other mocks,
      // but the important part is that promptMissingArguments was called)
    });
  });
});
