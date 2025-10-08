/**
 * Project Name Prompt Test
 *
 * Tests for promptProject function
 * Task 4.2: プロジェクト名入力プロンプトの実装
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { promptProject } from '@/cli/interactive-prompt.js';

// Mock @inquirer/prompts
vi.mock('@inquirer/prompts', () => ({
  input: vi.fn(),
}));

describe('promptProject', () => {
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
      const currentValue = 'my-project';
      const result = await promptProject(currentValue);

      expect(result).toBe('my-project');
      expect(mockInput).not.toHaveBeenCalled();
    });

    it('ハイフン、アンダースコア、ドット付きの値もそのまま返す', async () => {
      const currentValue = 'my_awesome-project.v2';
      const result = await promptProject(currentValue);

      expect(result).toBe('my_awesome-project.v2');
      expect(mockInput).not.toHaveBeenCalled();
    });

    it('空白のみの値は指定されていないとして扱う', async () => {
      mockInput.mockResolvedValue('my-project');

      const currentValue = '   ';
      const result = await promptProject(currentValue);

      expect(mockInput).toHaveBeenCalled();
      expect(result).toBe('my-project');
    });
  });

  describe('値が指定されていない場合', () => {
    it('inputプロンプトを表示する', async () => {
      mockInput.mockResolvedValue('my-project');

      const result = await promptProject('');

      expect(mockInput).toHaveBeenCalledTimes(1);
      expect(result).toBe('my-project');
    });

    it('適切なメッセージでプロンプトを表示する', async () => {
      mockInput.mockResolvedValue('my-project');

      await promptProject('');

      expect(mockInput).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Enter project name',
        })
      );
    });

    it('バリデーション関数が設定されている', async () => {
      mockInput.mockResolvedValue('my-project');

      await promptProject('');

      const callArgs = mockInput.mock.calls[0][0];
      expect(callArgs).toHaveProperty('validate');
      expect(typeof callArgs.validate).toBe('function');
    });
  });

  describe('バリデーション', () => {
    it('有効なプロジェクト名はtrueを返す', async () => {
      mockInput.mockResolvedValue('my-project');

      await promptProject('');

      const callArgs = mockInput.mock.calls[0][0];
      const validate = callArgs.validate;

      expect(validate('my-project')).toBe(true);
      expect(validate('project_123')).toBe(true);
      expect(validate('my.project')).toBe(true);
    });

    it('空文字列はエラーメッセージを返す', async () => {
      mockInput.mockResolvedValue('my-project');

      await promptProject('');

      const callArgs = mockInput.mock.calls[0][0];
      const validate = callArgs.validate;

      const result = validate('');
      expect(typeof result).toBe('string');
      expect(result).toContain('empty');
    });

    it('空白のみはエラーメッセージを返す', async () => {
      mockInput.mockResolvedValue('my-project');

      await promptProject('');

      const callArgs = mockInput.mock.calls[0][0];
      const validate = callArgs.validate;

      const result = validate('   ');
      expect(typeof result).toBe('string');
      expect(result).toContain('empty');
    });

    it('パストラバーサル("..")はエラーメッセージを返す', async () => {
      mockInput.mockResolvedValue('my-project');

      await promptProject('');

      const callArgs = mockInput.mock.calls[0][0];
      const validate = callArgs.validate;

      const result = validate('../evil');
      expect(typeof result).toBe('string');
      expect(result).toContain('..');
    });

    it('スラッシュはエラーメッセージを返す', async () => {
      mockInput.mockResolvedValue('my-project');

      await promptProject('');

      const callArgs = mockInput.mock.calls[0][0];
      const validate = callArgs.validate;

      const result = validate('my/project');
      expect(typeof result).toBe('string');
      expect(result).toContain('path separators');
    });

    it('バックスラッシュはエラーメッセージを返す', async () => {
      mockInput.mockResolvedValue('my-project');

      await promptProject('');

      const callArgs = mockInput.mock.calls[0][0];
      const validate = callArgs.validate;

      const result = validate('my\\project');
      expect(typeof result).toBe('string');
      expect(result).toContain('path separators');
    });
  });

  describe('エッジケース', () => {
    it('undefinedは空文字列として扱う', async () => {
      mockInput.mockResolvedValue('my-project');

      const result = await promptProject(undefined as unknown as string);

      expect(mockInput).toHaveBeenCalled();
      expect(result).toBe('my-project');
    });

    it('単一文字のプロジェクト名を受け入れる', async () => {
      mockInput.mockResolvedValue('a');

      await promptProject('');

      const callArgs = mockInput.mock.calls[0][0];
      const validate = callArgs.validate;

      expect(validate('a')).toBe(true);
    });
  });
});
