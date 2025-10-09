/**
 * promptMissingArguments Function Test
 *
 * Tests for promptMissingArguments integration function
 * Task 4.5: 対話的プロンプトサービスの統合関数実装
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { promptMissingArguments } from '@/cli/interactive-prompt.js';
import type { ParsedArguments } from '@/cli/types.js';

// Mock @inquirer/prompts
vi.mock('@inquirer/prompts', () => ({
  input: vi.fn(),
  confirm: vi.fn(),
}));

// Mock console.log to capture output
const mockConsoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});

describe('promptMissingArguments', () => {
  let mockInput: ReturnType<typeof vi.fn>;
  let mockConfirm: ReturnType<typeof vi.fn>;

  const createValidArgs = (
    overrides?: Partial<ParsedArguments>
  ): ParsedArguments => ({
    repository: '',
    projects: [],
    output: '.',
    force: false,
    dryRun: false,
    verbose: false,
    track: false,
    checkUpdates: false,
    update: false,
    ...overrides,
  });

  beforeEach(async () => {
    const inquirer = await import('@inquirer/prompts');
    mockInput = inquirer.input as ReturnType<typeof vi.fn>;
    mockConfirm = inquirer.confirm as ReturnType<typeof vi.fn>;
    mockInput.mockClear();
    mockConfirm.mockClear();
    mockConsoleLog.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('引数不足の検出と補完', () => {
    it('リポジトリとプロジェクト両方が欠落している場合、両方をプロンプトする', async () => {
      mockInput
        .mockResolvedValueOnce('owner/repo') // repository prompt
        .mockResolvedValueOnce('my-project') // project prompt
        .mockResolvedValueOnce('.') // output prompt
        .mockResolvedValueOnce(''); // subdir prompt

      mockConfirm.mockResolvedValue(true);

      const args = createValidArgs();
      const result = await promptMissingArguments(args);

      expect(mockInput).toHaveBeenCalledTimes(4);
      expect(result.repository).toBe('owner/repo');
      expect(result.projects).toEqual(['my-project']);
    });

    it('リポジトリのみが指定されている場合、プロジェクトのみをプロンプトする', async () => {
      mockInput
        .mockResolvedValueOnce('my-project') // project prompt
        .mockResolvedValueOnce('.') // output prompt
        .mockResolvedValueOnce(''); // subdir prompt

      mockConfirm.mockResolvedValue(true);

      const args = createValidArgs({ repository: 'owner/repo' });
      const result = await promptMissingArguments(args);

      // repository prompt should be skipped
      expect(mockInput).toHaveBeenCalledTimes(3);
      expect(result.repository).toBe('owner/repo');
      expect(result.projects).toEqual(['my-project']);
    });

    it('プロジェクトのみが指定されている場合、リポジトリのみをプロンプトする', async () => {
      mockInput
        .mockResolvedValueOnce('owner/repo') // repository prompt
        .mockResolvedValueOnce('.') // output prompt
        .mockResolvedValueOnce(''); // subdir prompt

      mockConfirm.mockResolvedValue(true);

      const args = createValidArgs({ projects: ['my-project'] });
      const result = await promptMissingArguments(args);

      // project prompt should be skipped
      expect(mockInput).toHaveBeenCalledTimes(3);
      expect(result.repository).toBe('owner/repo');
      expect(result.projects).toEqual(['my-project']);
    });

    it('リポジトリとプロジェクトが両方指定されている場合、オプションパラメータのみをプロンプトする', async () => {
      mockInput
        .mockResolvedValueOnce('./custom-output') // output prompt
        .mockResolvedValueOnce('lib/src'); // subdir prompt

      mockConfirm.mockResolvedValue(true);

      const args = createValidArgs({
        repository: 'owner/repo',
        projects: ['my-project'],
      });
      const result = await promptMissingArguments(args);

      // Only output and subdir prompts
      expect(mockInput).toHaveBeenCalledTimes(2);
      expect(result.repository).toBe('owner/repo');
      expect(result.projects).toEqual(['my-project']);
      expect(result.output).toBe('./custom-output');
      expect(result.subdir).toBe('lib/src');
    });
  });

  describe('プロンプトの順序', () => {
    it('プロンプトは正しい順序で表示される（repository → project → output → subdir → confirm）', async () => {
      const callOrder: string[] = [];

      mockInput.mockImplementation((options) => {
        if (options.message.includes('subdirectory')) {
          callOrder.push('subdir');
          return Promise.resolve('');
        }
        if (options.message.includes('repository')) {
          callOrder.push('repository');
          return Promise.resolve('owner/repo');
        }
        if (options.message.includes('project')) {
          callOrder.push('project');
          return Promise.resolve('my-project');
        }
        if (options.message.includes('output')) {
          callOrder.push('output');
          return Promise.resolve('.');
        }
        return Promise.resolve('');
      });

      mockConfirm.mockImplementation(() => {
        callOrder.push('confirm');
        return Promise.resolve(true);
      });

      const args = createValidArgs();
      await promptMissingArguments(args);

      expect(callOrder).toEqual([
        'repository',
        'project',
        'output',
        'subdir',
        'confirm',
      ]);
    });
  });

  describe('確認プロンプト', () => {
    it('全ての入力が完了した後、確認プロンプトを表示する', async () => {
      mockInput
        .mockResolvedValueOnce('owner/repo')
        .mockResolvedValueOnce('my-project')
        .mockResolvedValueOnce('.')
        .mockResolvedValueOnce('');

      mockConfirm.mockResolvedValue(true);

      const args = createValidArgs();
      await promptMissingArguments(args);

      expect(mockConfirm).toHaveBeenCalledTimes(1);
      expect(mockConfirm).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringMatching(/実行|execute/i),
          default: false,
        })
      );
    });

    it('ユーザーが確認を承認した場合、補完された引数を返す', async () => {
      mockInput
        .mockResolvedValueOnce('owner/repo')
        .mockResolvedValueOnce('my-project')
        .mockResolvedValueOnce('.')
        .mockResolvedValueOnce('');

      mockConfirm.mockResolvedValue(true);

      const args = createValidArgs();
      const result = await promptMissingArguments(args);

      expect(result.repository).toBe('owner/repo');
      expect(result.projects).toEqual(['my-project']);
      expect(result.output).toBe('.');
      expect(result.subdir).toBeUndefined();
    });

    it('ユーザーが確認を拒否した場合、エラーをスローする', async () => {
      mockInput
        .mockResolvedValueOnce('owner/repo')
        .mockResolvedValueOnce('my-project')
        .mockResolvedValueOnce('.')
        .mockResolvedValueOnce('');

      mockConfirm.mockResolvedValue(false);

      const args = createValidArgs();

      await expect(promptMissingArguments(args)).rejects.toThrow(
        'Operation cancelled'
      );
    });
  });

  describe('戻り値の検証', () => {
    it('補完された引数は元の引数のプロパティを保持する', async () => {
      mockInput
        .mockResolvedValueOnce('owner/repo')
        .mockResolvedValueOnce('my-project')
        .mockResolvedValueOnce('.')
        .mockResolvedValueOnce('');

      mockConfirm.mockResolvedValue(true);

      const args = createValidArgs({
        force: true,
        dryRun: true,
        verbose: true,
      });
      const result = await promptMissingArguments(args);

      expect(result.force).toBe(true);
      expect(result.dryRun).toBe(true);
      expect(result.verbose).toBe(true);
    });

    it('サブディレクトリが入力されている場合、正しく設定される', async () => {
      mockInput
        .mockResolvedValueOnce('owner/repo')
        .mockResolvedValueOnce('my-project')
        .mockResolvedValueOnce('.')
        .mockResolvedValueOnce('lib/src');

      mockConfirm.mockResolvedValue(true);

      const args = createValidArgs();
      const result = await promptMissingArguments(args);

      expect(result.subdir).toBe('lib/src');
    });

    it('サブディレクトリが空の場合、undefinedが設定される', async () => {
      mockInput
        .mockResolvedValueOnce('owner/repo')
        .mockResolvedValueOnce('my-project')
        .mockResolvedValueOnce('.')
        .mockResolvedValueOnce('');

      mockConfirm.mockResolvedValue(true);

      const args = createValidArgs();
      const result = await promptMissingArguments(args);

      expect(result.subdir).toBeUndefined();
    });
  });

  describe('ブランチ付きリポジトリ', () => {
    it('ブランチ付きリポジトリが入力された場合、正しく設定される', async () => {
      mockInput
        .mockResolvedValueOnce('owner/repo#feature-branch')
        .mockResolvedValueOnce('my-project')
        .mockResolvedValueOnce('.')
        .mockResolvedValueOnce('');

      mockConfirm.mockResolvedValue(true);

      const args = createValidArgs();
      const result = await promptMissingArguments(args);

      expect(result.repository).toBe('owner/repo#feature-branch');
    });
  });

  describe('既存値の保持', () => {
    it('既にoutputが指定されている場合、プロンプトをスキップする', async () => {
      mockInput
        .mockResolvedValueOnce('owner/repo')
        .mockResolvedValueOnce('my-project')
        .mockResolvedValueOnce(''); // subdir only

      mockConfirm.mockResolvedValue(true);

      const args = createValidArgs({ output: './custom' });
      const result = await promptMissingArguments(args);

      // Should skip output prompt
      expect(mockInput).toHaveBeenCalledTimes(3);
      expect(result.output).toBe('./custom');
    });
  });
});
