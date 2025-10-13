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

      // Message includes chalk styling, so check if it contains the expected text
      const callArgs = mockInput.mock.calls[0][0];
      expect(callArgs.message).toContain('Enter GitHub repository');
      expect(callArgs.message).toContain('owner/repo');
      expect(callArgs.message).toContain('branch');
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

  /**
   * Task 7.2: 既存メタデータからのリポジトリ提案機能
   *
   * Requirements: 2.2
   * WHEN インタラクティブモードのリポジトリプロンプト
   * THEN Kirox CLIは既存メタデータからデフォルト値（最後に使用したリポジトリ）を提案するべきである
   */
  describe('Task 7.2: メタデータからのリポジトリ提案', () => {
    it('メタデータが提供された場合、最後のリポジトリをデフォルト値として提案する', async () => {
      const metadata = {
        version: '1.0',
        projects: [
          {
            repository: 'owner/repo1',
            projectName: 'proj1',
            fetchedAt: '2024-01-01T00:00:00Z',
            files: [],
          },
          {
            repository: 'owner/repo2',
            projectName: 'proj2',
            fetchedAt: '2024-01-02T00:00:00Z',
            files: [],
          },
        ],
      };

      mockInput.mockResolvedValue('owner/repo2');

      await promptRepository('', metadata);

      // Should call input with default value set to the last repository
      const callArgs = mockInput.mock.calls[0][0];
      expect(callArgs.message).toContain('Enter GitHub repository');
      expect(callArgs.default).toBe('owner/repo2');
    });

    it('メタデータが空の場合、デフォルト値なしでプロンプトを表示', async () => {
      const metadata = {
        version: '1.0',
        projects: [],
      };

      mockInput.mockResolvedValue('owner/repo');

      await promptRepository('', metadata);

      // Should call input without default value
      const callArgs = mockInput.mock.calls[0][0];
      expect(callArgs.message).toContain('Enter GitHub repository');

      // Verify default is not set
      expect(callArgs).not.toHaveProperty('default');
    });

    it('メタデータが提供されていない場合、デフォルト値なしでプロンプトを表示', async () => {
      mockInput.mockResolvedValue('owner/repo');

      await promptRepository('');

      // Should call input without default value
      const callArgs = mockInput.mock.calls[0][0];
      expect(callArgs.message).toContain('Enter GitHub repository');

      // Verify default is not set
      expect(callArgs).not.toHaveProperty('default');
    });

    it('リポジトリが既に指定されている場合、メタデータに関係なくそのまま返す', async () => {
      const metadata = {
        version: '1.0',
        projects: [
          {
            repository: 'owner/repo-old',
            projectName: 'proj',
            fetchedAt: '2024-01-01T00:00:00Z',
            files: [],
          },
        ],
      };

      const result = await promptRepository('owner/repo-new', metadata);

      // Should return provided value without prompting
      expect(result).toBe('owner/repo-new');
      expect(mockInput).not.toHaveBeenCalled();
    });

    it('メタデータから重複を排除して最後のリポジトリを提案', async () => {
      const metadata = {
        version: '1.0',
        projects: [
          {
            repository: 'owner/repo1',
            projectName: 'proj1',
            fetchedAt: '2024-01-01T00:00:00Z',
            files: [],
          },
          {
            repository: 'owner/repo1',
            projectName: 'proj2',
            fetchedAt: '2024-01-02T00:00:00Z',
            files: [],
          },
          {
            repository: 'owner/repo3',
            projectName: 'proj3',
            fetchedAt: '2024-01-03T00:00:00Z',
            files: [],
          },
        ],
      };

      mockInput.mockResolvedValue('owner/repo3');

      await promptRepository('', metadata);

      // Should suggest the last repository (owner/repo3)
      expect(mockInput).toHaveBeenCalledWith(
        expect.objectContaining({
          default: 'owner/repo3',
        })
      );
    });
  });
});
