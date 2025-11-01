/**
 * promptMissingArguments Function Test
 *
 * Tests for promptMissingArguments integration function
 * Task 4.5: 対話的プロンプトサービスの統合関数実装
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { promptMissingArguments } from '@/cli/interactive-prompt.js';
import type { ParsedArguments } from '@/cli/types.js.js';

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
    steering: false,
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
        .mockResolvedValueOnce('') // subdir prompt (Task 5.3: moved before project)
        .mockResolvedValueOnce('my-project') // project prompt
        .mockResolvedValueOnce('.'); // output prompt

      mockConfirm.mockResolvedValue(true);

      const args = createValidArgs();
      const result = await promptMissingArguments(args);

      expect(mockInput).toHaveBeenCalledTimes(4);
      expect(result.repository).toBe('owner/repo');
      expect(result.projects).toEqual(['my-project']);
    });

    it('リポジトリのみが指定されている場合、プロジェクトのみをプロンプトする', async () => {
      mockInput
        .mockResolvedValueOnce('') // subdir prompt (Task 5.3: moved before project)
        .mockResolvedValueOnce('my-project') // project prompt
        .mockResolvedValueOnce('.'); // output prompt

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
        .mockResolvedValueOnce('') // subdir prompt (Task 5.3: moved before output)
        .mockResolvedValueOnce('.'); // output prompt

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
        .mockResolvedValueOnce('lib/src') // subdir prompt (Task 5.3: moved before output)
        .mockResolvedValueOnce('./custom-output'); // output prompt

      mockConfirm.mockResolvedValue(true);

      const args = createValidArgs({
        repository: 'owner/repo',
        projects: ['my-project'],
      });
      const result = await promptMissingArguments(args);

      // Only subdir and output prompts (Task 5.3: subdir now comes first)
      expect(mockInput).toHaveBeenCalledTimes(2);
      expect(result.repository).toBe('owner/repo');
      expect(result.projects).toEqual(['my-project']);
      expect(result.output).toBe('./custom-output');
      expect(result.subdir).toBe('lib/src');
    });
  });

  describe('プロンプトの順序', () => {
    it('プロンプトは正しい順序で表示される（repository → subdir → project → output → confirm）', async () => {
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
        if (options.message.includes('project') || options.message.includes('プロジェクト')) {
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

      // Task 5.3: subdir prompt moved before project prompt
      expect(callOrder).toEqual([
        'repository',
        'subdir',
        'project',
        'output',
        'confirm',
      ]);
    });
  });

  describe('確認プロンプト', () => {
    it('全ての入力が完了した後、確認プロンプトを表示する', async () => {
      mockInput
        .mockResolvedValueOnce('owner/repo')
        .mockResolvedValueOnce('') // subdir (Task 5.3)
        .mockResolvedValueOnce('my-project')
        .mockResolvedValueOnce('.'); // output

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
        .mockResolvedValueOnce('') // subdir (Task 5.3)
        .mockResolvedValueOnce('my-project')
        .mockResolvedValueOnce('.'); // output

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
        .mockResolvedValueOnce('') // subdir (Task 5.3)
        .mockResolvedValueOnce('my-project')
        .mockResolvedValueOnce('.'); // output

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
        .mockResolvedValueOnce('') // subdir (Task 5.3)
        .mockResolvedValueOnce('my-project')
        .mockResolvedValueOnce('.'); // output

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
        .mockResolvedValueOnce('lib/src') // subdir (Task 5.3)
        .mockResolvedValueOnce('my-project')
        .mockResolvedValueOnce('.'); // output

      mockConfirm.mockResolvedValue(true);

      const args = createValidArgs();
      const result = await promptMissingArguments(args);

      expect(result.subdir).toBe('lib/src');
    });

    it('サブディレクトリが空の場合、undefinedが設定される', async () => {
      mockInput
        .mockResolvedValueOnce('owner/repo')
        .mockResolvedValueOnce('') // subdir (Task 5.3)
        .mockResolvedValueOnce('my-project')
        .mockResolvedValueOnce('.'); // output

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
        .mockResolvedValueOnce('') // subdir (Task 5.3)
        .mockResolvedValueOnce('my-project')
        .mockResolvedValueOnce('.'); // output

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
        .mockResolvedValueOnce('') // subdir (Task 5.3)
        .mockResolvedValueOnce('my-project');
        // output prompt skipped because it's already set

      mockConfirm.mockResolvedValue(true);

      const args = createValidArgs({ output: './custom' });
      const result = await promptMissingArguments(args);

      // Should skip output prompt (Task 5.3: only 3 prompts)
      expect(mockInput).toHaveBeenCalledTimes(3);
      expect(result.output).toBe('./custom');
    });
  });

  // Task 3.1: Steering mode - Tree API skip tests
  describe('--steering モード - Tree API スキップ', () => {
    it('--steering モード時、プロジェクトTree APIスキャンをスキップする（logger/client が利用可能でも）', async () => {
      // NOTE: Task 9.3でディレクトリTree APIスキャンが追加されました
      // このテストは、プロジェクト用のTree API（scanProjectsAcrossSubdirs）が
      // --steeringモード時にスキップされることを確認します

      // Mock logger and client
      const mockLogger = {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        verbose: vi.fn(),
      };

      mockInput
        .mockResolvedValueOnce('owner/repo')
        .mockResolvedValueOnce('') // subdir prompt (fallback after directory Tree API fails)
        .mockResolvedValueOnce('.'); // output prompt (NO project prompt in Task 3.2)

      mockConfirm.mockResolvedValue(true);

      const args = createValidArgs({
        steering: true,
        projects: [], // steering mode allows empty projects
      });

      // Pass logger to enable Tree API capability
      const result = await promptMissingArguments(args, undefined, mockLogger);

      // Task 9.3: --steering mode now uses directory Tree API ("Scanning repository for subdirectories")
      // But it should NOT call project Tree API ("Scanning repository for projects")
      expect(mockConsoleLog).not.toHaveBeenCalledWith(
        expect.stringContaining('Scanning repository for projects')
      );

      expect(result.steering).toBe(true);
    });

    it('通常モード時、Tree API スキャンは引き続き実行される（後方互換性）', async () => {
      // Mock logger and client - will cause prompts to fail, but we only check Tree API attempt
      const mockLogger = {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        verbose: vi.fn(),
      };

      mockInput
        .mockResolvedValueOnce('owner/repo')
        .mockResolvedValueOnce('') // subdir prompt
        .mockResolvedValueOnce('my-project') // project prompt (fallback after Tree API fails)
        .mockResolvedValueOnce('.'); // output prompt

      mockConfirm.mockResolvedValue(true);

      const args = createValidArgs({
        steering: false, // normal mode
        projects: [],
      });

      // Pass logger to enable Tree API capability
      await promptMissingArguments(args, undefined, mockLogger);

      // In normal mode, Tree API should be attempted (log message should be shown)
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('Scanning repository')
      );
    });
  });

  // Task 3.3: Steering mode - Subdirectory prompt display control
  describe('--steering モード - サブディレクトリプロンプト表示制御', () => {
    it('--steering モード時、サブディレクトリが未指定の場合にプロンプトを表示する（Requirement 4.1）', async () => {
      mockInput
        .mockResolvedValueOnce('owner/repo') // repository prompt
        .mockResolvedValueOnce('lib/src') // subdir prompt (should be displayed)
        .mockResolvedValueOnce('.'); // output prompt

      mockConfirm.mockResolvedValue(true);

      const args = createValidArgs({
        steering: true,
        projects: [],
        subdir: undefined, // Subdirectory not specified
      });

      const result = await promptMissingArguments(args);

      // Should call 3 input prompts (repository, subdir, output)
      expect(mockInput).toHaveBeenCalledTimes(3);

      // Subdirectory should be set from prompt
      expect(result.subdir).toBe('lib/src');
      expect(result.steering).toBe(true);
    });

    it('--steering モード時、サブディレクトリ入力プロンプトで空文字列が入力された場合、undefinedになる（Requirement 4.2）', async () => {
      mockInput
        .mockResolvedValueOnce('owner/repo') // repository prompt
        .mockResolvedValueOnce('') // subdir prompt (empty string)
        .mockResolvedValueOnce('.'); // output prompt

      mockConfirm.mockResolvedValue(true);

      const args = createValidArgs({
        steering: true,
        projects: [],
        subdir: undefined,
      });

      const result = await promptMissingArguments(args);

      // Subdirectory should be undefined (empty string becomes undefined)
      expect(result.subdir).toBeUndefined();
      expect(result.steering).toBe(true);
    });

    it('--steering モード時、サブディレクトリが既に指定されている場合はプロンプトをスキップする（Requirement 4.4）', async () => {
      mockInput
        .mockResolvedValueOnce('owner/repo') // repository prompt
        .mockResolvedValueOnce('.'); // output prompt (NO subdir prompt)

      mockConfirm.mockResolvedValue(true);

      const args = createValidArgs({
        steering: true,
        projects: [],
        subdir: 'packages/api', // Already specified
      });

      const result = await promptMissingArguments(args);

      // Should only call 2 input prompts (repository, output)
      expect(mockInput).toHaveBeenCalledTimes(2);

      // Subdirectory should remain as specified
      expect(result.subdir).toBe('packages/api');
      expect(result.steering).toBe(true);
    });

    it('--steering モード時、有効なサブディレクトリパスが入力された場合、そのまま設定される（Requirement 4.3）', async () => {
      mockInput
        .mockResolvedValueOnce('owner/repo') // repository prompt
        .mockResolvedValueOnce('packages/core') // subdir prompt (valid path)
        .mockResolvedValueOnce('.'); // output prompt

      mockConfirm.mockResolvedValue(true);

      const args = createValidArgs({
        steering: true,
        projects: [],
        subdir: undefined,
      });

      const result = await promptMissingArguments(args);

      // Subdirectory should be set from prompt
      expect(result.subdir).toBe('packages/core');
      expect(result.steering).toBe(true);
    });
  });

  // Task 3.2: Steering mode - Project prompt skip tests
  describe('--steering モード - プロジェクトプロンプトスキップ', () => {
    it('--steering モード時、プロジェクトプロンプトをスキップする（Requirement 3.4）', async () => {
      mockInput
        .mockResolvedValueOnce('owner/repo') // repository prompt
        .mockResolvedValueOnce('') // subdir prompt
        .mockResolvedValueOnce('.'); // output prompt (NO project prompt)

      mockConfirm.mockResolvedValue(true);

      const args = createValidArgs({
        steering: true,
        projects: [], // steering mode allows empty projects
      });

      const result = await promptMissingArguments(args);

      // Should only call 3 input prompts (repository, subdir, output)
      expect(mockInput).toHaveBeenCalledTimes(3);

      // Projects should remain empty
      expect(result.projects).toEqual([]);
      expect(result.steering).toBe(true);
    });

    it('--steering モード時、プロジェクトが既に指定されている場合もプロンプトをスキップする', async () => {
      mockInput
        .mockResolvedValueOnce('owner/repo') // repository prompt
        .mockResolvedValueOnce('') // subdir prompt
        .mockResolvedValueOnce('.'); // output prompt (NO project prompt)

      mockConfirm.mockResolvedValue(true);

      const args = createValidArgs({
        steering: true,
        projects: ['my-project'], // Pre-specified project (should be ignored in steering mode)
      });

      const result = await promptMissingArguments(args);

      // Should only call 3 input prompts (repository, subdir, output)
      expect(mockInput).toHaveBeenCalledTimes(3);

      // Projects should be preserved (not modified)
      expect(result.projects).toEqual(['my-project']);
      expect(result.steering).toBe(true);
    });

    it('通常モード時、プロジェクトプロンプトは引き続き表示される（Requirement 3.5: 後方互換性）', async () => {
      mockInput
        .mockResolvedValueOnce('owner/repo') // repository prompt
        .mockResolvedValueOnce('') // subdir prompt
        .mockResolvedValueOnce('my-project') // project prompt (should be displayed)
        .mockResolvedValueOnce('.'); // output prompt

      mockConfirm.mockResolvedValue(true);

      const args = createValidArgs({
        steering: false, // normal mode
        projects: [],
      });

      const result = await promptMissingArguments(args);

      // Should call 4 input prompts (repository, subdir, project, output)
      expect(mockInput).toHaveBeenCalledTimes(4);

      // Project should be prompted and set
      expect(result.projects).toEqual(['my-project']);
      expect(result.steering).toBe(false);
    });
  });
});
