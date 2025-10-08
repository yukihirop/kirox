/**
 * Interactive Error Handling Test
 *
 * Tests for error handling in interactive mode
 * Task 5.1: Ctrl+C中断処理の実装
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { promptMissingArguments } from '@/cli/interactive-prompt.js';
import type { ParsedArguments } from '@/cli/types.js';

// Mock @inquirer/prompts
vi.mock('@inquirer/prompts', () => ({
  input: vi.fn(),
  confirm: vi.fn(),
}));

describe('Interactive Error Handling', () => {
  let mockInput: ReturnType<typeof vi.fn>;
  let mockConfirm: ReturnType<typeof vi.fn>;

  const createValidArgs = (): ParsedArguments => ({
    repository: '',
    project: '',
    output: '.',
    force: false,
    dryRun: false,
    verbose: false,
    track: false,
    checkUpdates: false,
    update: false,
  });

  beforeEach(async () => {
    const inquirer = await import('@inquirer/prompts');
    mockInput = inquirer.input as ReturnType<typeof vi.fn>;
    mockConfirm = inquirer.confirm as ReturnType<typeof vi.fn>;
    mockInput.mockClear();
    mockConfirm.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Ctrl+C中断処理 (ExitPromptError)', () => {
    it('リポジトリ入力中のCtrl+Cでエラーをスローする', async () => {
      // Simulate ExitPromptError from @inquirer/prompts
      const exitError = new Error('User force closed the prompt');
      exitError.name = 'ExitPromptError';
      mockInput.mockRejectedValue(exitError);

      const args = createValidArgs();

      await expect(promptMissingArguments(args)).rejects.toThrow(
        'User force closed the prompt'
      );
    });

    it('プロジェクト入力中のCtrl+Cでエラーをスローする', async () => {
      mockInput
        .mockResolvedValueOnce('owner/repo') // repository prompt succeeds
        .mockRejectedValueOnce(new Error('User force closed the prompt')); // project prompt fails

      const exitError = mockInput.mock.results[1]?.value;
      if (exitError instanceof Promise) {
        exitError.catch((e: Error) => {
          e.name = 'ExitPromptError';
        });
      }

      const args = createValidArgs();

      await expect(promptMissingArguments(args)).rejects.toThrow();
    });

    it('確認プロンプト中のCtrl+Cでエラーをスローする', async () => {
      mockInput
        .mockResolvedValueOnce('owner/repo')
        .mockResolvedValueOnce('my-project')
        .mockResolvedValueOnce('.')
        .mockResolvedValueOnce('');

      const exitError = new Error('User force closed the prompt');
      exitError.name = 'ExitPromptError';
      mockConfirm.mockRejectedValue(exitError);

      const args = createValidArgs();

      await expect(promptMissingArguments(args)).rejects.toThrow(
        'User force closed the prompt'
      );
    });

    it('ExitPromptErrorのnameプロパティが正しく設定されている', async () => {
      const exitError = new Error('User force closed the prompt');
      exitError.name = 'ExitPromptError';
      mockInput.mockRejectedValue(exitError);

      const args = createValidArgs();

      try {
        await promptMissingArguments(args);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        if (error instanceof Error) {
          expect(error.name).toBe('ExitPromptError');
        }
      }
    });
  });

  describe('エラーメッセージの検証', () => {
    it('ExitPromptErrorは標準的なメッセージを持つ', async () => {
      const exitError = new Error('User force closed the prompt');
      exitError.name = 'ExitPromptError';
      mockInput.mockRejectedValue(exitError);

      const args = createValidArgs();

      try {
        await promptMissingArguments(args);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        if (error instanceof Error) {
          expect(error.message).toContain('User force closed the prompt');
        }
      }
    });
  });

  describe('エラー伝播の確認', () => {
    it('ExitPromptErrorは呼び出し元に伝播する', async () => {
      const exitError = new Error('User force closed the prompt');
      exitError.name = 'ExitPromptError';
      mockInput.mockRejectedValue(exitError);

      const args = createValidArgs();

      // Verify that the error propagates without being caught
      await expect(promptMissingArguments(args)).rejects.toThrow(
        'User force closed the prompt'
      );
    });

    it('ExitPromptErrorは他のエラーと区別できる', async () => {
      const exitError = new Error('User force closed the prompt');
      exitError.name = 'ExitPromptError';
      mockInput.mockRejectedValue(exitError);

      const args = createValidArgs();

      try {
        await promptMissingArguments(args);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        if (error instanceof Error) {
          // ExitPromptError should be distinguishable by its name
          expect(error.name).toBe('ExitPromptError');
          expect(error.name).not.toBe('Error');
        }
      }
    });
  });
});
