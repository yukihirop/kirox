/**
 * Project Name Prompt Test
 *
 * Tests for promptProject function
 * Task 4.2: プロジェクト名入力プロンプトの実装
 * Task 4.1: promptProject関数にサジェスト機能を統合
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { promptProject } from '@/cli/interactive-prompt.js';
import type { Octokit } from 'octokit';
import type { Logger } from '@/reporting/logger.js';

// Mock @inquirer/prompts
vi.mock('@inquirer/prompts', () => ({
  input: vi.fn(),
}));

// Mock project-suggester module
vi.mock('@/cli/project-suggester.js', () => ({
  suggestProjects: vi.fn(),
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
          message: 'Enter project name (comma-separated for multiple projects)',
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

  describe('プロジェクトサジェスト機能統合 (Task 4.1)', () => {
    let mockSuggestProjects: ReturnType<typeof vi.fn>;
    let mockClient: Octokit;
    let mockLogger: Logger;

    beforeEach(async () => {
      const suggester = await import('@/cli/project-suggester.js');
      mockSuggestProjects = suggester.suggestProjects as ReturnType<typeof vi.fn>;
      mockSuggestProjects.mockClear();

      // Create mock Octokit client and Logger
      mockClient = {} as Octokit;
      mockLogger = {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
      } as unknown as Logger;
    });

    describe('既存機能との互換性維持 (Requirement 5.1)', () => {
      it('currentValueが指定されている場合、サジェスト機能をスキップする', async () => {
        const currentValue = 'existing-project';
        const repository = 'owner/repo';

        const result = await promptProject(
          currentValue,
          repository,
          undefined,
          mockClient,
          mockLogger,
          false
        );

        expect(result).toBe('existing-project');
        expect(mockSuggestProjects).not.toHaveBeenCalled();
        expect(mockInput).not.toHaveBeenCalled();
      });
    });

    describe('依存注入パラメータのチェック (Requirement 5.2)', () => {
      it('repositoryが指定されていない場合、手動入力モードにフォールバック', async () => {
        mockInput.mockResolvedValue('manual-project');

        const result = await promptProject('', undefined, undefined, mockClient, mockLogger, false);

        expect(mockSuggestProjects).not.toHaveBeenCalled();
        expect(mockInput).toHaveBeenCalled();
        expect(result).toBe('manual-project');
      });

      it('clientが指定されていない場合、手動入力モードにフォールバック', async () => {
        mockInput.mockResolvedValue('manual-project');

        const result = await promptProject('', 'owner/repo', undefined, undefined, mockLogger, false);

        expect(mockSuggestProjects).not.toHaveBeenCalled();
        expect(mockInput).toHaveBeenCalled();
        expect(result).toBe('manual-project');
      });

      it('loggerが指定されていない場合、手動入力モードにフォールバック', async () => {
        mockInput.mockResolvedValue('manual-project');

        const result = await promptProject('', 'owner/repo', undefined, mockClient, undefined, false);

        expect(mockSuggestProjects).not.toHaveBeenCalled();
        expect(mockInput).toHaveBeenCalled();
        expect(result).toBe('manual-project');
      });

      it('全ての依存が揃っている場合、サジェスト機能を呼び出す', async () => {
        mockSuggestProjects.mockResolvedValue({
          projects: ['suggested-project'],
          success: true,
        });

        const repository = 'owner/repo';

        const result = await promptProject('', repository, undefined, mockClient, mockLogger, false);

        expect(mockSuggestProjects).toHaveBeenCalledWith({
          repository: { owner: 'owner', repo: 'repo', branch: undefined },
          subdir: undefined,
          client: mockClient,
          logger: mockLogger,
          verbose: false,
        });
        expect(result).toBe('suggested-project');
      });
    });

    describe('サジェスト成功時 (Requirement 5.3)', () => {
      it('単一プロジェクト選択時、プロジェクト名を返す', async () => {
        mockSuggestProjects.mockResolvedValue({
          projects: ['selected-project'],
          success: true,
        });

        const result = await promptProject('', 'owner/repo', undefined, mockClient, mockLogger, false);

        expect(result).toBe('selected-project');
        expect(mockInput).not.toHaveBeenCalled();
      });

      it('複数プロジェクト選択時、カンマ区切り文字列を返す', async () => {
        mockSuggestProjects.mockResolvedValue({
          projects: ['project-a', 'project-b', 'project-c'],
          success: true,
        });

        const result = await promptProject('', 'owner/repo', undefined, mockClient, mockLogger, false);

        expect(result).toBe('project-a,project-b,project-c');
        expect(mockInput).not.toHaveBeenCalled();
      });

      it('ブランチ指定がある場合、repositoryオブジェクトにbranchを含める', async () => {
        mockSuggestProjects.mockResolvedValue({
          projects: ['suggested-project'],
          success: true,
        });

        const repository = 'owner/repo#feature-branch';

        await promptProject('', repository, undefined, mockClient, mockLogger, false);

        expect(mockSuggestProjects).toHaveBeenCalledWith({
          repository: { owner: 'owner', repo: 'repo', branch: 'feature-branch' },
          subdir: undefined,
          client: mockClient,
          logger: mockLogger,
          verbose: false,
        });
      });

      it('サブディレクトリが指定されている場合、subdirパラメータに渡す', async () => {
        mockSuggestProjects.mockResolvedValue({
          projects: ['suggested-project'],
          success: true,
        });

        const repository = 'owner/repo';
        const subdir = 'lib/components';

        await promptProject('', repository, subdir, mockClient, mockLogger, false);

        expect(mockSuggestProjects).toHaveBeenCalledWith({
          repository: { owner: 'owner', repo: 'repo', branch: undefined },
          subdir: 'lib/components',
          client: mockClient,
          logger: mockLogger,
          verbose: false,
        });
      });

      it('verboseフラグをsuggestProjectsに渡す', async () => {
        mockSuggestProjects.mockResolvedValue({
          projects: ['suggested-project'],
          success: true,
        });

        await promptProject('', 'owner/repo', undefined, mockClient, mockLogger, true);

        expect(mockSuggestProjects).toHaveBeenCalledWith({
          repository: { owner: 'owner', repo: 'repo', branch: undefined },
          subdir: undefined,
          client: mockClient,
          logger: mockLogger,
          verbose: true,
        });
      });
    });

    describe('サジェスト失敗時のフォールバック (Requirement 5.4)', () => {
      it('success: falseの場合、手動入力モードにフォールバック', async () => {
        mockSuggestProjects.mockResolvedValue({
          projects: [],
          success: false,
          errorMessage: '.kiro/specs/ directory not found',
        });
        mockInput.mockResolvedValue('manual-project');

        const result = await promptProject('', 'owner/repo', undefined, mockClient, mockLogger, false);

        expect(mockInput).toHaveBeenCalled();
        expect(result).toBe('manual-project');
      });

      it('エラーメッセージが存在する場合、コンソールに表示する', async () => {
        const consoleLogSpy = vi.spyOn(console, 'log');
        mockSuggestProjects.mockResolvedValue({
          projects: [],
          success: false,
          errorMessage: 'Authentication error: Please set GITHUB_TOKEN',
        });
        mockInput.mockResolvedValue('manual-project');

        await promptProject('', 'owner/repo', undefined, mockClient, mockLogger, false);

        expect(consoleLogSpy).toHaveBeenCalledWith('Authentication error: Please set GITHUB_TOKEN');
        consoleLogSpy.mockRestore();
      });

      it('suggestProjectsが例外をスローした場合、手動入力モードにフォールバック', async () => {
        mockSuggestProjects.mockRejectedValue(new Error('Network error'));
        mockInput.mockResolvedValue('manual-project');

        const result = await promptProject('', 'owner/repo', undefined, mockClient, mockLogger, false);

        expect(mockInput).toHaveBeenCalled();
        expect(result).toBe('manual-project');
      });
    });
  });
});
