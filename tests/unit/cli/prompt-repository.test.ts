/**
 * Repository Prompt Test
 *
 * Tests for promptRepository function
 * Task 4.1: リポジトリ入力プロンプトの実装
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { promptRepository } from '@/cli/interactive-prompt.js';

// Mock @inquirer/prompts
vi.mock('@inquirer/prompts', () => ({
  input: vi.fn(),
}));

describe('promptRepository', () => {
  let mockInput: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    const inquirer = await import('@inquirer/prompts');
    mockInput = inquirer.input as ReturnType<typeof vi.fn>;
    mockInput.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('既に値が指定されている場合', () => {
    it('現在の値をそのまま返す（プロンプト表示なし）', async () => {
      const currentValue = 'facebook/react';
      const result = await promptRepository(currentValue);

      expect(result).toBe('facebook/react');
      expect(mockInput).not.toHaveBeenCalled();
    });

    it('ブランチ付きの値もそのまま返す', async () => {
      const currentValue = 'owner/repo#branch';
      const result = await promptRepository(currentValue);

      expect(result).toBe('owner/repo#branch');
      expect(mockInput).not.toHaveBeenCalled();
    });

    it('空白のみの値は指定されていないとして扱う', async () => {
      mockInput.mockResolvedValue('owner/repo');

      const currentValue = '   ';
      const result = await promptRepository(currentValue);

      expect(mockInput).toHaveBeenCalled();
      expect(result).toBe('owner/repo');
    });
  });

  describe('値が指定されていない場合', () => {
    it('inputプロンプトを表示する', async () => {
      mockInput.mockResolvedValue('owner/repo');

      const result = await promptRepository('');

      expect(mockInput).toHaveBeenCalledTimes(1);
      expect(result).toBe('owner/repo');
    });

    it('適切なメッセージでプロンプトを表示する', async () => {
      mockInput.mockResolvedValue('owner/repo');

      await promptRepository('');

      expect(mockInput).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Enter GitHub repository (owner/repo)',
        })
      );
    });

    it('バリデーション関数が設定されている', async () => {
      mockInput.mockResolvedValue('owner/repo');

      await promptRepository('');

      const callArgs = mockInput.mock.calls[0][0];
      expect(callArgs).toHaveProperty('validate');
      expect(typeof callArgs.validate).toBe('function');
    });
  });

  describe('バリデーション', () => {
    it('有効なリポジトリ形式はtrueを返す', async () => {
      mockInput.mockResolvedValue('owner/repo');

      await promptRepository('');

      const callArgs = mockInput.mock.calls[0][0];
      const validate = callArgs.validate;

      expect(validate('facebook/react')).toBe(true);
      expect(validate('owner/repo#branch')).toBe(true);
    });

    it('無効なリポジトリ形式はエラーメッセージを返す', async () => {
      mockInput.mockResolvedValue('owner/repo');

      await promptRepository('');

      const callArgs = mockInput.mock.calls[0][0];
      const validate = callArgs.validate;

      const result = validate('invalid-repo');
      expect(typeof result).toBe('string');
      expect(result).toContain('owner/repo');
    });

    it('空文字列はエラーメッセージを返す', async () => {
      mockInput.mockResolvedValue('owner/repo');

      await promptRepository('');

      const callArgs = mockInput.mock.calls[0][0];
      const validate = callArgs.validate;

      const result = validate('');
      expect(typeof result).toBe('string');
    });

    it('スラッシュなしはエラーメッセージを返す', async () => {
      mockInput.mockResolvedValue('owner/repo');

      await promptRepository('');

      const callArgs = mockInput.mock.calls[0][0];
      const validate = callArgs.validate;

      const result = validate('facebook');
      expect(typeof result).toBe('string');
    });

    it('owner部分が空の場合はエラーメッセージを返す', async () => {
      mockInput.mockResolvedValue('owner/repo');

      await promptRepository('');

      const callArgs = mockInput.mock.calls[0][0];
      const validate = callArgs.validate;

      const result = validate('/repo');
      expect(typeof result).toBe('string');
    });

    it('repo部分が空の場合はエラーメッセージを返す', async () => {
      mockInput.mockResolvedValue('owner/repo');

      await promptRepository('');

      const callArgs = mockInput.mock.calls[0][0];
      const validate = callArgs.validate;

      const result = validate('owner/');
      expect(typeof result).toBe('string');
    });
  });

  describe('エッジケース', () => {
    it('undefinedは空文字列として扱う', async () => {
      mockInput.mockResolvedValue('owner/repo');

      const result = await promptRepository(undefined as unknown as string);

      expect(mockInput).toHaveBeenCalled();
      expect(result).toBe('owner/repo');
    });
  });
});
