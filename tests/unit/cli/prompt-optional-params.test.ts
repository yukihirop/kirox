/**
 * Optional Parameters Prompt Test
 *
 * Tests for promptOutput and promptSubdir functions
 * Task 4.3: オプションパラメータ入力プロンプトの実装
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { promptOutput, promptSubdir } from '@/cli/interactive-prompt.js';

// Mock @inquirer/prompts
vi.mock('@inquirer/prompts', () => ({
  input: vi.fn(),
}));

describe('promptOutput', () => {
  let mockInput: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    const inquirer = await import('@inquirer/prompts');
    mockInput = inquirer.input as ReturnType<typeof vi.fn>;
    mockInput.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('デフォルト値の適用', () => {
    it('デフォルト値"."でプロンプトを表示する', async () => {
      mockInput.mockResolvedValue('.');

      await promptOutput();

      expect(mockInput).toHaveBeenCalledWith(
        expect.objectContaining({
          default: '.',
        })
      );
    });

    it('ユーザーがEnterのみ押した場合はデフォルト値を返す', async () => {
      mockInput.mockResolvedValue('.');

      const result = await promptOutput();

      expect(result).toBe('.');
    });
  });

  describe('カスタム値の入力', () => {
    it('ユーザーが指定したパスを返す', async () => {
      mockInput.mockResolvedValue('./output');

      const result = await promptOutput();

      expect(result).toBe('./output');
    });

    it('絶対パスを受け入れる', async () => {
      mockInput.mockResolvedValue('/tmp/output');

      const result = await promptOutput();

      expect(result).toBe('/tmp/output');
    });

    it('相対パスを受け入れる', async () => {
      mockInput.mockResolvedValue('../output');

      const result = await promptOutput();

      expect(result).toBe('../output');
    });
  });

  describe('メッセージ', () => {
    it('適切なメッセージでプロンプトを表示する', async () => {
      mockInput.mockResolvedValue('.');

      await promptOutput();

      // Check call arguments (Chalk styling may be present)
      const callArgs = mockInput.mock.calls[0][0];
      expect(callArgs.message).toContain('Enter output directory');
    });
  });
});

describe('promptSubdir', () => {
  let mockInput: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    const inquirer = await import('@inquirer/prompts');
    mockInput = inquirer.input as ReturnType<typeof vi.fn>;
    mockInput.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('空文字列入力時の処理', () => {
    it('空文字列を入力した場合はundefinedを返す', async () => {
      mockInput.mockResolvedValue('');

      const result = await promptSubdir();

      expect(result).toBeUndefined();
    });

    it('空白のみを入力した場合はundefinedを返す', async () => {
      mockInput.mockResolvedValue('   ');

      const result = await promptSubdir();

      expect(result).toBeUndefined();
    });
  });

  describe('有効なサブディレクトリパス', () => {
    it('サブディレクトリパスを返す', async () => {
      mockInput.mockResolvedValue('src');

      const result = await promptSubdir();

      expect(result).toBe('src');
    });

    it('ネストされたパスを返す', async () => {
      mockInput.mockResolvedValue('lib/a/b');

      const result = await promptSubdir();

      expect(result).toBe('lib/a/b');
    });

    it('ドット始まりのパスを返す', async () => {
      mockInput.mockResolvedValue('.config');

      const result = await promptSubdir();

      expect(result).toBe('.config');
    });
  });

  describe('メッセージ', () => {
    it('適切なメッセージでプロンプトを表示する', async () => {
      mockInput.mockResolvedValue('');

      await promptSubdir();

      // Check call arguments (Chalk styling may be present)
      const callArgs = mockInput.mock.calls[0][0];
      expect(callArgs.message).toContain('Enter subdirectory');
      expect(callArgs.message).toContain('optional');
    });

    it('オプションであることを示すメッセージを含む', async () => {
      mockInput.mockResolvedValue('');

      await promptSubdir();

      expect(mockInput).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringMatching(/optional/i),
        })
      );
    });

    it('GitHubリポジトリの形容詞を含む', async () => {
      mockInput.mockResolvedValue('');

      await promptSubdir();

      expect(mockInput).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringMatching(/GitHub repository/i),
        })
      );
    });
  });

  describe('デフォルト値', () => {
    it('デフォルト値は空文字列である', async () => {
      mockInput.mockResolvedValue('');

      await promptSubdir();

      expect(mockInput).toHaveBeenCalledWith(
        expect.objectContaining({
          default: '',
        })
      );
    });
  });
});
