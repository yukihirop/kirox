/**
 * Interactive Mode Error Handling Integration Tests
 *
 * Tests error handling in interactive mode.
 * Task 9.3: エラーハンドリングの統合テスト
 *
 * Verifies that:
 * - Ctrl+C interruption returns exit code 130
 * - Confirmation prompt cancellation returns exit code 0
 * - Non-TTY environment is properly handled
 * - Error logs are recorded correctly
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { execute } from '../../src/cli/entry.js';
import * as interactive from '../../src/cli/interactive-prompt.js';
import { ExitPromptError } from '@inquirer/core';

// Mock modules
vi.mock('../../src/cli/interactive-prompt.js');
vi.mock('../../src/github/fetcher.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/github/fetcher.js')>();
  return {
    ...actual,
    fetchDirectoryContents: vi.fn().mockResolvedValue([
      { type: 'file', name: 'spec.json', path: '.kiro/specs/test-project/spec.json' },
    ]),
  };
});
vi.mock('../../src/github/parallel-fetcher.js', () => ({
  fetchFilesInParallel: vi.fn().mockResolvedValue({
    success: [{ path: '.kiro/specs/test-project/spec.json', content: '{}', sha: 'abc123', size: 2 }],
    failed: [],
  }),
}));
vi.mock('../../src/filesystem/writer.js', () => ({
  writeFile: vi.fn().mockResolvedValue({ written: true }),
}));
vi.mock('../../src/config/loader.js', () => ({
  loadConfig: vi.fn().mockResolvedValue({}),
}));
vi.mock('../../src/tracking/metadata-manager.js', () => ({
  loadMetadata: vi.fn().mockResolvedValue({ projects: [] }),
  upsertProject: vi.fn(),
  upsertFile: vi.fn(),
}));

describe('Interactive Mode Error Handling Integration', () => {
  let mockShouldEnterInteractiveMode: ReturnType<typeof vi.fn>;
  let mockPromptMissingArguments: ReturnType<typeof vi.fn>;
  let mockCheckTTYEnvironment: ReturnType<typeof vi.fn>;
  let mockHandleInteractiveError: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    // Reset all mocks first
    vi.clearAllMocks();

    // Get mocked functions
    mockShouldEnterInteractiveMode = interactive.shouldEnterInteractiveMode as ReturnType<typeof vi.fn>;
    mockPromptMissingArguments = interactive.promptMissingArguments as ReturnType<typeof vi.fn>;
    mockCheckTTYEnvironment = interactive.checkTTYEnvironment as ReturnType<typeof vi.fn>;
    mockHandleInteractiveError = interactive.handleInteractiveError as ReturnType<typeof vi.fn>;

    // Default successful TTY check
    mockCheckTTYEnvironment.mockReturnValue({ success: true });
  });

  describe('Ctrl+C中断時の終了コード検証', () => {
    it('should return exit code 130 when user presses Ctrl+C', async () => {
      // RED: Test that Ctrl+C returns exit code 130
      mockShouldEnterInteractiveMode.mockReturnValue(true);

      // Simulate Ctrl+C (ExitPromptError)
      const exitPromptError = new ExitPromptError();
      mockPromptMissingArguments.mockRejectedValue(exitPromptError);

      // Mock handleInteractiveError to return correct exit code
      mockHandleInteractiveError.mockReturnValue({
        exitCode: 130,
      });

      const result = await execute(['node', 'kirox']);

      // Verify exit code 130
      expect(result.success).toBe(false);
      expect(result.exitCode).toBe(130);
      expect(result.filesDownloaded).toBe(0);
      expect(result.filesFailed).toBe(0);
    });

    it('should call handleInteractiveError with ExitPromptError', async () => {
      mockShouldEnterInteractiveMode.mockReturnValue(true);

      const exitPromptError = new ExitPromptError();
      mockPromptMissingArguments.mockRejectedValue(exitPromptError);

      mockHandleInteractiveError.mockReturnValue({
        exitCode: 130,
      });

      await execute(['node', 'kirox']);

      // Verify handleInteractiveError was called with the error
      expect(mockHandleInteractiveError).toHaveBeenCalledWith(
        exitPromptError,
        expect.any(Object) // logger
      );
    });
  });

  describe('確認プロンプトキャンセル時の終了コード検証', () => {
    it('should return exit code 0 when user cancels at confirmation prompt', async () => {
      // RED: Test that confirmation cancellation returns exit code 0
      mockShouldEnterInteractiveMode.mockReturnValue(true);

      // Simulate user cancelling at confirmation (custom error or specific rejection)
      const cancelError = new Error('Operation cancelled');
      mockPromptMissingArguments.mockRejectedValue(cancelError);

      mockHandleInteractiveError.mockReturnValue({
        exitCode: 0,
      });

      const result = await execute(['node', 'kirox']);

      expect(result.success).toBe(false);
      expect(result.exitCode).toBe(0);
    });

    it('should handle confirmation rejection gracefully', async () => {
      mockShouldEnterInteractiveMode.mockReturnValue(true);

      const cancelError = new Error('Operation cancelled');
      mockPromptMissingArguments.mockRejectedValue(cancelError);

      mockHandleInteractiveError.mockReturnValue({
        exitCode: 0,
      });

      const result = await execute(['node', 'kirox']);

      expect(mockHandleInteractiveError).toHaveBeenCalled();
      expect(result.filesDownloaded).toBe(0);
      expect(result.filesFailed).toBe(0);
    });
  });

  describe('非TTY環境での動作検証', () => {
    it('should return exit code 1 when not in TTY environment', async () => {
      // RED: Test that non-TTY environment returns exit code 1
      mockShouldEnterInteractiveMode.mockReturnValue(true);

      // Mock TTY check to fail
      mockCheckTTYEnvironment.mockReturnValue({
        success: false,
        exitCode: 1,
      });

      const result = await execute(['node', 'kirox']);

      expect(result.success).toBe(false);
      expect(result.exitCode).toBe(1);
      expect(result.filesDownloaded).toBe(0);
      expect(result.filesFailed).toBe(0);
    });

    it('should not call promptMissingArguments when TTY check fails', async () => {
      mockShouldEnterInteractiveMode.mockReturnValue(true);

      mockCheckTTYEnvironment.mockReturnValue({
        success: false,
        exitCode: 1,
      });

      await execute(['node', 'kirox']);

      // Verify prompt was not called
      expect(mockPromptMissingArguments).not.toHaveBeenCalled();
    });

    it('should display appropriate error message for non-TTY environment', async () => {
      mockShouldEnterInteractiveMode.mockReturnValue(true);

      mockCheckTTYEnvironment.mockReturnValue({
        success: false,
        exitCode: 1,
      });

      const result = await execute(['node', 'kirox']);

      // Verify checkTTYEnvironment was called
      expect(mockCheckTTYEnvironment).toHaveBeenCalled();
      expect(result.exitCode).toBe(1);
    });
  });

  describe('エラーログの記録検証', () => {
    it('should log error when interactive mode fails', async () => {
      mockShouldEnterInteractiveMode.mockReturnValue(true);

      const testError = new Error('Test error');
      mockPromptMissingArguments.mockRejectedValue(testError);

      mockHandleInteractiveError.mockReturnValue({
        exitCode: 1,
      });

      await execute(['node', 'kirox']);

      // Verify error was handled
      expect(mockHandleInteractiveError).toHaveBeenCalledWith(
        testError,
        expect.any(Object)
      );
    });

    it('should log different error types correctly', async () => {
      mockShouldEnterInteractiveMode.mockReturnValue(true);

      const errorTypes = [
        { error: new ExitPromptError(), expectedCode: 130 },
        { error: new Error('Operation cancelled'), expectedCode: 0 },
        { error: new Error('Unknown error'), expectedCode: 1 },
      ];

      for (const { error, expectedCode } of errorTypes) {
        vi.clearAllMocks();
        mockCheckTTYEnvironment.mockReturnValue({ success: true });
        mockPromptMissingArguments.mockRejectedValue(error);
        mockHandleInteractiveError.mockReturnValue({ exitCode: expectedCode });

        const result = await execute(['node', 'kirox']);

        expect(mockHandleInteractiveError).toHaveBeenCalledWith(
          error,
          expect.any(Object)
        );
        expect(result.exitCode).toBe(expectedCode);
      }
    });
  });

  describe('複合的なエラーシナリオ', () => {
    it('should handle error during prompt and still return proper exit code', async () => {
      mockShouldEnterInteractiveMode.mockReturnValue(true);

      // Simulate error during prompting
      const promptError = new Error('Prompt validation failed');
      mockPromptMissingArguments.mockRejectedValue(promptError);

      mockHandleInteractiveError.mockReturnValue({
        exitCode: 1,
      });

      const result = await execute(['node', 'kirox']);

      expect(result.success).toBe(false);
      expect(result.exitCode).toBe(1);
      expect(mockHandleInteractiveError).toHaveBeenCalled();
    });

    it('should not execute fetch when interactive mode errors', async () => {
      mockShouldEnterInteractiveMode.mockReturnValue(true);

      mockPromptMissingArguments.mockRejectedValue(new ExitPromptError());
      mockHandleInteractiveError.mockReturnValue({ exitCode: 130 });

      const result = await execute(['node', 'kirox']);

      // Verify no files were fetched
      expect(result.filesDownloaded).toBe(0);
      expect(result.filesFailed).toBe(0);
    });
  });

  describe('エラーリカバリー検証', () => {
    it('should allow retry after error in non-interactive execution', async () => {
      // First call fails due to interactive mode error
      mockShouldEnterInteractiveMode.mockReturnValueOnce(true);
      mockPromptMissingArguments.mockRejectedValueOnce(new Error('First attempt failed'));
      mockHandleInteractiveError.mockReturnValueOnce({ exitCode: 1 });

      const firstResult = await execute(['node', 'kirox']);
      expect(firstResult.success).toBe(false);

      // Second call succeeds with full args (non-interactive)
      vi.clearAllMocks();
      mockCheckTTYEnvironment.mockReturnValue({ success: true });
      mockShouldEnterInteractiveMode.mockReturnValue(false);

      const secondResult = await execute(['node', 'kirox', 'owner/repo', '-p', 'project']);
      expect(secondResult.success).toBe(true);
    });
  });
});
