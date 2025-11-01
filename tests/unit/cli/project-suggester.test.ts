/**
 * Project Suggester Service Test
 *
 * Tests for ProjectSuggester service
 * Task 1.1: プロジェクトサジェスターサービスのコア機能を実装
 * Task 2.1: selectプロンプトによる単一プロジェクト選択機能を実装
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Octokit } from 'octokit';
import type { Logger } from '@/reporting/logger.js';

// Mock fetchDirectoryContents
vi.mock('@/github/fetcher.js', () => ({
  fetchDirectoryContents: vi.fn(),
}));

// Mock @inquirer/prompts
vi.mock('@inquirer/prompts', () => ({
  select: vi.fn(),
  checkbox: vi.fn(),
}));

describe('ProjectSuggester', () => {
  let mockClient: Octokit;
  let mockLogger: Logger;
  let mockFetchDirectoryContents: ReturnType<typeof vi.fn>;
  let mockSelect: ReturnType<typeof vi.fn>;
  let mockCheckbox: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    // Create mock client and logger
    mockClient = {} as Octokit;
    mockLogger = {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    } as unknown as Logger;

    // Import and setup mocks
    const fetcher = await import('@/github/fetcher.js');
    mockFetchDirectoryContents = fetcher.fetchDirectoryContents as ReturnType<
      typeof vi.fn
    >;
    mockFetchDirectoryContents.mockClear();

    const inquirer = await import('@inquirer/prompts');
    mockSelect = inquirer.select as ReturnType<typeof vi.fn>;
    mockCheckbox = inquirer.checkbox as ReturnType<typeof vi.fn>;
    mockSelect.mockClear();
    mockCheckbox.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('プロジェクト一覧取得', () => {
    it('GitHub APIから.kiro/specs/配下のプロジェクト一覧を取得する', async () => {
      // Arrange
      const mockProjects = [
        { name: 'project-a', path: '.kiro/specs/project-a', type: 'dir' as const, sha: 'abc123' },
        { name: 'project-b', path: '.kiro/specs/project-b', type: 'dir' as const, sha: 'def456' },
        { name: 'README.md', path: '.kiro/specs/README.md', type: 'file' as const, sha: 'ghi789' },
      ];

      mockFetchDirectoryContents.mockResolvedValue(mockProjects);

      // Act
      const { suggestProjects } = await import('@/cli/project-suggester.js');
      const result = await suggestProjects({
        repository: { owner: 'test-owner', repo: 'test-repo' },
        client: mockClient,
        logger: mockLogger,
        verbose: false,
      });

      // Assert
      expect(mockFetchDirectoryContents).toHaveBeenCalledWith(
        mockClient,
        'test-owner',
        'test-repo',
        '.kiro/specs',
        undefined
      );
      expect(result.projects).toEqual(['project-a', 'project-b']);
      expect(result.success).toBe(true);
    });

    it('サブディレクトリが指定されている場合、{subdir}/.kiro/specs/からプロジェクト一覧を取得する', async () => {
      // Arrange
      const mockProjects = [
        { name: 'project-x', path: 'lib/a/.kiro/specs/project-x', type: 'dir' as const, sha: 'abc123' },
        { name: 'project-y', path: 'lib/a/.kiro/specs/project-y', type: 'dir' as const, sha: 'def456' },
      ];

      mockFetchDirectoryContents.mockResolvedValue(mockProjects);

      // Act
      const { suggestProjects } = await import('@/cli/project-suggester.js');
      const result = await suggestProjects({
        repository: { owner: 'test-owner', repo: 'test-repo' },
        subdir: 'lib/a',
        client: mockClient,
        logger: mockLogger,
        verbose: false,
      });

      // Assert
      expect(mockFetchDirectoryContents).toHaveBeenCalledWith(
        mockClient,
        'test-owner',
        'test-repo',
        'lib/a/.kiro/specs',
        undefined
      );
      expect(result.projects).toEqual(['project-x', 'project-y']);
      expect(result.success).toBe(true);
    });

    it('ブランチが指定されている場合、refパラメータを渡す', async () => {
      // Arrange
      const mockProjects = [
        { name: 'project-a', path: '.kiro/specs/project-a', type: 'dir' as const, sha: 'abc123' },
      ];

      mockFetchDirectoryContents.mockResolvedValue(mockProjects);

      // Act
      const { suggestProjects } = await import('@/cli/project-suggester.js');
      const result = await suggestProjects({
        repository: { owner: 'test-owner', repo: 'test-repo', branch: 'develop' },
        client: mockClient,
        logger: mockLogger,
        verbose: false,
      });

      // Assert
      expect(mockFetchDirectoryContents).toHaveBeenCalledWith(
        mockClient,
        'test-owner',
        'test-repo',
        '.kiro/specs',
        'develop'
      );
      expect(result.projects).toEqual(['project-a']);
      expect(result.success).toBe(true);
    });

    it('ディレクトリのみをフィルタリングして抽出する', async () => {
      // Arrange
      const mockContents = [
        { name: 'project-a', path: '.kiro/specs/project-a', type: 'dir' as const, sha: 'abc123' },
        { name: 'README.md', path: '.kiro/specs/README.md', type: 'file' as const, sha: 'def456' },
        { name: 'project-b', path: '.kiro/specs/project-b', type: 'dir' as const, sha: 'ghi789' },
        { name: '.gitignore', path: '.kiro/specs/.gitignore', type: 'file' as const, sha: 'jkl012' },
      ];

      mockFetchDirectoryContents.mockResolvedValue(mockContents);

      // Act
      const { suggestProjects } = await import('@/cli/project-suggester.js');
      const result = await suggestProjects({
        repository: { owner: 'test-owner', repo: 'test-repo' },
        client: mockClient,
        logger: mockLogger,
        verbose: false,
      });

      // Assert
      expect(result.projects).toEqual(['project-a', 'project-b']);
      expect(result.success).toBe(true);
    });
  });

  describe('エラーハンドリング', () => {
    it('404エラー時はフォールバックフラグと適切なエラーメッセージを設定する', async () => {
      // Arrange
      const error404 = new Error('Repository not found');
      Object.assign(error404, { status: 404 });
      mockFetchDirectoryContents.mockRejectedValue(error404);

      // Act
      const { suggestProjects } = await import('@/cli/project-suggester.js');
      const result = await suggestProjects({
        repository: { owner: 'test-owner', repo: 'test-repo' },
        client: mockClient,
        logger: mockLogger,
        verbose: false,
      });

      // Assert
      expect(result.success).toBe(false);
      expect(result.projects).toEqual([]);
      expect(result.errorMessage).toBe('.kiro/specs/ directory not found in repository');
    });

    it('401エラー時はフォールバックフラグと認証エラーメッセージを設定する', async () => {
      // Arrange
      const error401 = new Error('Unauthorized');
      Object.assign(error401, { status: 401 });
      mockFetchDirectoryContents.mockRejectedValue(error401);

      // Act
      const { suggestProjects } = await import('@/cli/project-suggester.js');
      const result = await suggestProjects({
        repository: { owner: 'test-owner', repo: 'test-repo' },
        client: mockClient,
        logger: mockLogger,
        verbose: false,
      });

      // Assert
      expect(result.success).toBe(false);
      expect(result.projects).toEqual([]);
      expect(result.errorMessage).toBe('Authentication error: Please set GITHUB_TOKEN environment variable');
    });

    it('403エラー時はフォールバックフラグと認証エラーメッセージを設定する', async () => {
      // Arrange
      const error403 = new Error('Forbidden');
      Object.assign(error403, { status: 403 });
      mockFetchDirectoryContents.mockRejectedValue(error403);

      // Act
      const { suggestProjects } = await import('@/cli/project-suggester.js');
      const result = await suggestProjects({
        repository: { owner: 'test-owner', repo: 'test-repo' },
        client: mockClient,
        logger: mockLogger,
        verbose: false,
      });

      // Assert
      expect(result.success).toBe(false);
      expect(result.projects).toEqual([]);
      expect(result.errorMessage).toBe('Authentication error: Please set GITHUB_TOKEN environment variable');
    });

    it('その他のエラー時はフォールバックフラグと汎用エラーメッセージを設定する', async () => {
      // Arrange
      const networkError = new Error('Network error');
      mockFetchDirectoryContents.mockRejectedValue(networkError);

      // Act
      const { suggestProjects } = await import('@/cli/project-suggester.js');
      const result = await suggestProjects({
        repository: { owner: 'test-owner', repo: 'test-repo' },
        client: mockClient,
        logger: mockLogger,
        verbose: false,
      });

      // Assert
      expect(result.success).toBe(false);
      expect(result.projects).toEqual([]);
      expect(result.errorMessage).toBe('Failed to fetch project list from GitHub');
    });

    it('空ディレクトリの場合はフォールバックフラグと適切なメッセージを設定する', async () => {
      // Arrange
      mockFetchDirectoryContents.mockResolvedValue([]);

      // Act
      const { suggestProjects } = await import('@/cli/project-suggester.js');
      const result = await suggestProjects({
        repository: { owner: 'test-owner', repo: 'test-repo' },
        client: mockClient,
        logger: mockLogger,
        verbose: false,
      });

      // Assert
      expect(result.success).toBe(false);
      expect(result.projects).toEqual([]);
      expect(result.errorMessage).toBe('No projects found in .kiro/specs/');
    });

    it('ファイルのみでディレクトリがない場合はフォールバックフラグと適切なメッセージを設定する', async () => {
      // Arrange
      const mockContents = [
        { name: 'README.md', path: '.kiro/specs/README.md', type: 'file' as const, sha: 'abc123' },
        { name: '.gitignore', path: '.kiro/specs/.gitignore', type: 'file' as const, sha: 'def456' },
      ];
      mockFetchDirectoryContents.mockResolvedValue(mockContents);

      // Act
      const { suggestProjects } = await import('@/cli/project-suggester.js');
      const result = await suggestProjects({
        repository: { owner: 'test-owner', repo: 'test-repo' },
        client: mockClient,
        logger: mockLogger,
        verbose: false,
      });

      // Assert
      expect(result.success).toBe(false);
      expect(result.projects).toEqual([]);
      expect(result.errorMessage).toBe('No projects found in .kiro/specs/');
    });
  });

  describe('verboseログ出力', () => {
    it('verboseフラグがtrueの場合、API呼び出し前のログを出力する', async () => {
      // Arrange
      mockFetchDirectoryContents.mockResolvedValue([
        { name: 'project-a', path: '.kiro/specs/project-a', type: 'dir' as const, sha: 'abc123' },
      ]);

      // Act
      const { suggestProjects } = await import('@/cli/project-suggester.js');
      await suggestProjects({
        repository: { owner: 'test-owner', repo: 'test-repo', branch: 'main' },
        client: mockClient,
        logger: mockLogger,
        verbose: true,
      });

      // Assert
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('Fetching available projects'),
        expect.objectContaining({
          repository: 'test-owner/test-repo',
          branch: 'main',
          path: '.kiro/specs',
        })
      );
    });

    it('verboseフラグがtrueの場合、API成功時のログを出力する', async () => {
      // Arrange
      mockFetchDirectoryContents.mockResolvedValue([
        { name: 'project-a', path: '.kiro/specs/project-a', type: 'dir' as const, sha: 'abc123' },
        { name: 'project-b', path: '.kiro/specs/project-b', type: 'dir' as const, sha: 'def456' },
      ]);

      // Act
      const { suggestProjects } = await import('@/cli/project-suggester.js');
      await suggestProjects({
        repository: { owner: 'test-owner', repo: 'test-repo' },
        client: mockClient,
        logger: mockLogger,
        verbose: true,
      });

      // Assert
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('Successfully fetched projects'),
        expect.objectContaining({
          count: 2,
          projects: ['project-a', 'project-b'],
        })
      );
    });

    it('verboseフラグがtrueの場合、API失敗時のログを出力する', async () => {
      // Arrange
      const error404 = new Error('Repository not found');
      Object.assign(error404, { status: 404 });
      mockFetchDirectoryContents.mockRejectedValue(error404);

      // Act
      const { suggestProjects } = await import('@/cli/project-suggester.js');
      await suggestProjects({
        repository: { owner: 'test-owner', repo: 'test-repo' },
        client: mockClient,
        logger: mockLogger,
        verbose: true,
      });

      // Assert
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('Failed to fetch projects'),
        expect.objectContaining({
          error: expect.any(String),
          repository: 'test-owner/test-repo',
        })
      );
    });

    it('verboseフラグがfalseの場合、ログを出力しない', async () => {
      // Arrange
      mockFetchDirectoryContents.mockResolvedValue([
        { name: 'project-a', path: '.kiro/specs/project-a', type: 'dir' as const, sha: 'abc123' },
      ]);

      // Act
      const { suggestProjects } = await import('@/cli/project-suggester.js');
      await suggestProjects({
        repository: { owner: 'test-owner', repo: 'test-repo' },
        client: mockClient,
        logger: mockLogger,
        verbose: false,
      });

      // Assert
      expect(mockLogger.info).not.toHaveBeenCalled();
      expect(mockLogger.error).not.toHaveBeenCalled();
    });
  });

  describe('単一プロジェクト選択UI (Task 2.1)', () => {
    it('selectプロンプトを使用してプロジェクトを選択する', async () => {
      // Arrange
      const projects = ['project-a', 'project-b', 'project-c'];
      mockSelect.mockResolvedValue('project-b');

      // Act
      const { promptSingleProject } = await import('@/cli/project-suggester.js');
      const result = await promptSingleProject(projects);

      // Assert
      expect(mockSelect).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Select a project',
          pageSize: 10,
          loop: true,
        })
      );
      expect(result).toBe('project-b');
    });

    it('選択されたプロジェクト名を文字列として返す', async () => {
      // Arrange
      const projects = ['project-x', 'project-y'];
      mockSelect.mockResolvedValue('project-x');

      // Act
      const { promptSingleProject } = await import('@/cli/project-suggester.js');
      const result = await promptSingleProject(projects);

      // Assert
      expect(typeof result).toBe('string');
      expect(result).toBe('project-x');
    });

    it('選択肢にプロジェクト名と複数選択モードオプションを含める', async () => {
      // Arrange
      const projects = ['project-a', 'project-b'];
      mockSelect.mockResolvedValue('project-a');

      // Act
      const { promptSingleProject } = await import('@/cli/project-suggester.js');
      await promptSingleProject(projects);

      // Assert
      expect(mockSelect).toHaveBeenCalledWith(
        expect.objectContaining({
          choices: expect.arrayContaining([
            { name: 'project-a', value: 'project-a' },
            { name: 'project-b', value: 'project-b' },
            { name: '[Select multiple projects...]', value: '__MULTIPLE__' },
          ]),
        })
      );
    });

    it('複数選択モード選択肢が最後に配置される', async () => {
      // Arrange
      const projects = ['project-a', 'project-b', 'project-c'];
      mockSelect.mockResolvedValue('project-a');

      // Act
      const { promptSingleProject } = await import('@/cli/project-suggester.js');
      await promptSingleProject(projects);

      // Assert
      const callArgs = mockSelect.mock.calls[0][0];
      const choices = callArgs.choices;
      expect(choices[choices.length - 1]).toEqual({
        name: '[Select multiple projects...]',
        value: '__MULTIPLE__',
      });
    });

    it('ページサイズが10に設定される', async () => {
      // Arrange
      const projects = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8', 'p9', 'p10', 'p11'];
      mockSelect.mockResolvedValue('p1');

      // Act
      const { promptSingleProject } = await import('@/cli/project-suggester.js');
      await promptSingleProject(projects);

      // Assert
      expect(mockSelect).toHaveBeenCalledWith(
        expect.objectContaining({
          pageSize: 10,
        })
      );
    });

    it('ループ設定がtrueに設定される', async () => {
      // Arrange
      const projects = ['project-a', 'project-b'];
      mockSelect.mockResolvedValue('project-a');

      // Act
      const { promptSingleProject } = await import('@/cli/project-suggester.js');
      await promptSingleProject(projects);

      // Assert
      expect(mockSelect).toHaveBeenCalledWith(
        expect.objectContaining({
          loop: true,
        })
      );
    });

    it('複数選択モード(__MULTIPLE__)が選択された場合、その値を返す', async () => {
      // Arrange
      const projects = ['project-a', 'project-b'];
      mockSelect.mockResolvedValue('__MULTIPLE__');

      // Act
      const { promptSingleProject } = await import('@/cli/project-suggester.js');
      const result = await promptSingleProject(projects);

      // Assert
      expect(result).toBe('__MULTIPLE__');
    });
  });

  describe('選択結果の処理とフォーマット変換 (Task 2.2)', () => {
    it('単一プロジェクト名を配列に変換する', async () => {
      // Arrange
      const projectName = 'my-project';

      // Act
      const { formatSingleProjectToArray } = await import('@/cli/project-suggester.js');
      const result = formatSingleProjectToArray(projectName);

      // Assert
      expect(Array.isArray(result)).toBe(true);
      expect(result).toEqual(['my-project']);
    });

    it('空文字列の場合は空配列を返す', async () => {
      // Arrange
      const projectName = '';

      // Act
      const { formatSingleProjectToArray } = await import('@/cli/project-suggester.js');
      const result = formatSingleProjectToArray(projectName);

      // Assert
      expect(Array.isArray(result)).toBe(true);
      expect(result).toEqual([]);
    });

    it('MULTIPLE_SELECTION_MARKERの場合はそのまま配列に格納する', async () => {
      // Arrange
      const { MULTIPLE_SELECTION_MARKER, formatSingleProjectToArray } = await import('@/cli/project-suggester.js');

      // Act
      const result = formatSingleProjectToArray(MULTIPLE_SELECTION_MARKER);

      // Assert
      expect(Array.isArray(result)).toBe(true);
      expect(result).toEqual([MULTIPLE_SELECTION_MARKER]);
    });
  });

  describe('複数プロジェクト選択UI (Task 3.1)', () => {
    it('checkboxプロンプトを使用してプロジェクトを選択する', async () => {
      // Arrange
      const projects = ['project-a', 'project-b', 'project-c'];
      mockCheckbox.mockResolvedValue(['project-a', 'project-c']);

      // Act
      const { promptMultipleProjects } = await import('@/cli/project-suggester.js');
      const result = await promptMultipleProjects(projects);

      // Assert
      expect(mockCheckbox).toHaveBeenCalledWith(
        expect.objectContaining({
          message: '📋 Select projects (Space to select, Enter to confirm)',
          pageSize: 10,
          loop: true,
        })
      );
      expect(result).toEqual(['project-a', 'project-c']);
    });

    it('選択肢にプロジェクト名を全て含める', async () => {
      // Arrange
      const projects = ['project-a', 'project-b', 'project-c'];
      mockCheckbox.mockResolvedValue(['project-b']);

      // Act
      const { promptMultipleProjects } = await import('@/cli/project-suggester.js');
      await promptMultipleProjects(projects);

      // Assert
      expect(mockCheckbox).toHaveBeenCalledWith(
        expect.objectContaining({
          choices: expect.arrayContaining([
            { name: 'project-a', value: 'project-a' },
            { name: 'project-b', value: 'project-b' },
            { name: 'project-c', value: 'project-c' },
          ]),
        })
      );
    });

    it('ページサイズが10に設定される', async () => {
      // Arrange
      const projects = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8', 'p9', 'p10', 'p11'];
      mockCheckbox.mockResolvedValue(['p1']);

      // Act
      const { promptMultipleProjects } = await import('@/cli/project-suggester.js');
      await promptMultipleProjects(projects);

      // Assert
      expect(mockCheckbox).toHaveBeenCalledWith(
        expect.objectContaining({
          pageSize: 10,
        })
      );
    });

    it('ループ設定がtrueに設定される', async () => {
      // Arrange
      const projects = ['project-a', 'project-b'];
      mockCheckbox.mockResolvedValue(['project-a']);

      // Act
      const { promptMultipleProjects } = await import('@/cli/project-suggester.js');
      await promptMultipleProjects(projects);

      // Assert
      expect(mockCheckbox).toHaveBeenCalledWith(
        expect.objectContaining({
          loop: true,
        })
      );
    });

    it('複数のプロジェクトを選択して配列として返す', async () => {
      // Arrange
      const projects = ['project-a', 'project-b', 'project-c', 'project-d'];
      mockCheckbox.mockResolvedValue(['project-a', 'project-b', 'project-d']);

      // Act
      const { promptMultipleProjects } = await import('@/cli/project-suggester.js');
      const result = await promptMultipleProjects(projects);

      // Assert
      expect(Array.isArray(result)).toBe(true);
      expect(result).toEqual(['project-a', 'project-b', 'project-d']);
    });

    it('1つのプロジェクトのみを選択した場合も配列として返す', async () => {
      // Arrange
      const projects = ['project-a', 'project-b'];
      mockCheckbox.mockResolvedValue(['project-b']);

      // Act
      const { promptMultipleProjects } = await import('@/cli/project-suggester.js');
      const result = await promptMultipleProjects(projects);

      // Assert
      expect(Array.isArray(result)).toBe(true);
      expect(result).toEqual(['project-b']);
    });
  });

  describe('複数選択時のバリデーション (Task 3.2)', () => {
    it('0個選択時はエラーメッセージを表示して再度プロンプトを表示する', async () => {
      // Arrange
      const projects = ['project-a', 'project-b', 'project-c'];
      // First attempt: empty selection, Second attempt: valid selection
      mockCheckbox
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce(['project-a']);

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

      // Act
      const { promptMultipleProjectsWithValidation } = await import('@/cli/project-suggester.js');
      const result = await promptMultipleProjectsWithValidation(projects);

      // Assert
      expect(mockCheckbox).toHaveBeenCalledTimes(2);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Please select at least one project')
      );
      expect(result).toEqual(['project-a']);

      consoleErrorSpy.mockRestore();
    });

    it('複数回0個選択してもリトライし続ける', async () => {
      // Arrange
      const projects = ['project-a', 'project-b'];
      // Three attempts with empty selections, then valid selection
      mockCheckbox
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce(['project-b']);

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

      // Act
      const { promptMultipleProjectsWithValidation } = await import('@/cli/project-suggester.js');
      const result = await promptMultipleProjectsWithValidation(projects);

      // Assert
      expect(mockCheckbox).toHaveBeenCalledTimes(4);
      expect(consoleErrorSpy).toHaveBeenCalledTimes(3);
      expect(result).toEqual(['project-b']);

      consoleErrorSpy.mockRestore();
    });

    it('最初から1つ以上選択した場合はバリデーションエラーなしで即座に返す', async () => {
      // Arrange
      const projects = ['project-a', 'project-b', 'project-c'];
      mockCheckbox.mockResolvedValue(['project-a', 'project-c']);

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

      // Act
      const { promptMultipleProjectsWithValidation } = await import('@/cli/project-suggester.js');
      const result = await promptMultipleProjectsWithValidation(projects);

      // Assert
      expect(mockCheckbox).toHaveBeenCalledTimes(1);
      expect(consoleErrorSpy).not.toHaveBeenCalled();
      expect(result).toEqual(['project-a', 'project-c']);

      consoleErrorSpy.mockRestore();
    });
  });

  describe('複数選択結果の処理とフォーマット変換 (Task 3.3)', () => {
    it('プロジェクト名配列をカンマ区切り文字列に変換する', async () => {
      // Arrange
      const projects = ['project-a', 'project-b', 'project-c'];

      // Act
      const { formatMultipleProjectsToString } = await import('@/cli/project-suggester.js');
      const result = formatMultipleProjectsToString(projects);

      // Assert
      expect(typeof result).toBe('string');
      expect(result).toBe('project-a,project-b,project-c');
    });

    it('単一プロジェクト配列もカンマ区切り文字列に変換する', async () => {
      // Arrange
      const projects = ['single-project'];

      // Act
      const { formatMultipleProjectsToString } = await import('@/cli/project-suggester.js');
      const result = formatMultipleProjectsToString(projects);

      // Assert
      expect(typeof result).toBe('string');
      expect(result).toBe('single-project');
    });

    it('空配列は空文字列に変換する', async () => {
      // Arrange
      const projects: string[] = [];

      // Act
      const { formatMultipleProjectsToString } = await import('@/cli/project-suggester.js');
      const result = formatMultipleProjectsToString(projects);

      // Assert
      expect(typeof result).toBe('string');
      expect(result).toBe('');
    });
  });

  describe('ローディングメッセージ表示 (Task 5.1)', () => {
    it('GitHub API呼び出し前に「Fetching available projects...」メッセージを表示する', async () => {
      // Arrange
      const stdoutWriteSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
      mockFetchDirectoryContents.mockResolvedValue([
        { name: 'project-a', path: '.kiro/specs/project-a', type: 'dir' as const, sha: 'abc123' },
      ]);

      // Act
      const { suggestProjects } = await import('@/cli/project-suggester.js');
      await suggestProjects({
        repository: { owner: 'test-owner', repo: 'test-repo' },
        client: mockClient,
        logger: mockLogger,
        verbose: false,
      });

      // Assert
      expect(stdoutWriteSpy).toHaveBeenCalledWith(
        expect.stringContaining('Fetching available projects')
      );

      stdoutWriteSpy.mockRestore();
    });

    it('API呼び出し完了後にローディングメッセージをクリアする', async () => {
      // Arrange
      const stdoutWriteSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
      mockFetchDirectoryContents.mockResolvedValue([
        { name: 'project-a', path: '.kiro/specs/project-a', type: 'dir' as const, sha: 'abc123' },
      ]);

      // Act
      const { suggestProjects } = await import('@/cli/project-suggester.js');
      await suggestProjects({
        repository: { owner: 'test-owner', repo: 'test-repo' },
        client: mockClient,
        logger: mockLogger,
        verbose: false,
      });

      // Assert - Loading message should be cleared (shown then cleared)
      expect(stdoutWriteSpy).toHaveBeenCalledWith(
        expect.stringContaining('Fetching available projects')
      );
      // The last call should clear the loading message
      const lastCall = stdoutWriteSpy.mock.calls[stdoutWriteSpy.mock.calls.length - 1];
      expect(lastCall[0]).toBe('\r\x1b[K'); // Clear line escape sequence

      stdoutWriteSpy.mockRestore();
    });

    it('3秒以上かかる場合は「Please wait...」追加メッセージを表示する', async () => {
      // Arrange
      const stdoutWriteSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);

      // Simulate slow API call (3.5 seconds)
      mockFetchDirectoryContents.mockImplementation(() => {
        return new Promise((resolve) => {
          setTimeout(() => {
            resolve([
              { name: 'project-a', path: '.kiro/specs/project-a', type: 'dir' as const, sha: 'abc123' },
            ]);
          }, 3500);
        });
      });

      // Act
      const { suggestProjects } = await import('@/cli/project-suggester.js');
      await suggestProjects({
        repository: { owner: 'test-owner', repo: 'test-repo' },
        client: mockClient,
        logger: mockLogger,
        verbose: false,
      });

      // Assert - Should show additional wait message
      expect(stdoutWriteSpy).toHaveBeenCalledWith(
        expect.stringContaining('Please wait')
      );

      stdoutWriteSpy.mockRestore();
    }, 10000); // Increase timeout for this test

    it('API呼び出しが3秒未満で完了する場合は追加メッセージを表示しない', async () => {
      // Arrange
      const stdoutWriteSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);

      // Simulate fast API call (1 second)
      mockFetchDirectoryContents.mockImplementation(() => {
        return new Promise((resolve) => {
          setTimeout(() => {
            resolve([
              { name: 'project-a', path: '.kiro/specs/project-a', type: 'dir' as const, sha: 'abc123' },
            ]);
          }, 1000);
        });
      });

      // Act
      const { suggestProjects } = await import('@/cli/project-suggester.js');
      await suggestProjects({
        repository: { owner: 'test-owner', repo: 'test-repo' },
        client: mockClient,
        logger: mockLogger,
        verbose: false,
      });

      // Assert - Should NOT show additional wait message
      const waitMessages = stdoutWriteSpy.mock.calls.filter(
        call => call[0] && call[0].includes && call[0].includes('Please wait')
      );
      expect(waitMessages.length).toBe(0);

      stdoutWriteSpy.mockRestore();
    }, 10000); // Increase timeout for this test

    it('エラー時もローディングメッセージをクリアする', async () => {
      // Arrange
      const stdoutWriteSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
      const error404 = new Error('Repository not found');
      Object.assign(error404, { status: 404 });
      mockFetchDirectoryContents.mockRejectedValue(error404);

      // Act
      const { suggestProjects } = await import('@/cli/project-suggester.js');
      await suggestProjects({
        repository: { owner: 'test-owner', repo: 'test-repo' },
        client: mockClient,
        logger: mockLogger,
        verbose: false,
      });

      // Assert - Loading message should be cleared even on error
      expect(stdoutWriteSpy).toHaveBeenCalledWith(
        expect.stringContaining('Fetching available projects')
      );
      const lastCall = stdoutWriteSpy.mock.calls[stdoutWriteSpy.mock.calls.length - 1];
      expect(lastCall[0]).toBe('\r\x1b[K'); // Clear line escape sequence

      stdoutWriteSpy.mockRestore();
    });
  });
});
