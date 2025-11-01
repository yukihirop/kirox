/**
 * promptMissingArguments Branch Selection Integration Test
 *
 * Tests for branch selection logic in promptMissingArguments (Task 3.1)
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { promptMissingArguments } from '@/cli/interactive-prompt.js';
import type { ParsedArguments } from '@/cli/types.js';
import type { PinoLogger } from '@/reporting/pino-logger.js';
import { Octokit } from 'octokit';

// Mock modules
vi.mock('@inquirer/prompts', () => ({
  input: vi.fn(),
  confirm: vi.fn(),
}));

vi.mock('@/cli/branch-prompt.js', () => ({
  promptBranch: vi.fn(),
}));

vi.mock('@/github/fetcher.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/github/fetcher.js')>();
  return {
    ...actual,
    fetchBranches: vi.fn(),
    fetchDefaultBranch: vi.fn(),
    parseRepositoryPath: actual.parseRepositoryPath, // Keep real implementation
  };
});

// Mock Octokit to control client creation
vi.mock('octokit', () => ({
  Octokit: vi.fn(() => ({})), // Return empty mock client
}));

// Mock Tree API scanner to prevent it from running during branch tests
vi.mock('@/github/tree-based-project-scanner.js', () => ({
  scanProjectsAcrossSubdirs: vi.fn().mockResolvedValue({
    success: false,
    projects: [],
    truncated: false,
  }),
}));

// Mock project suggester to prevent it from running
vi.mock('@/cli/project-suggester.js', () => ({
  suggestProjects: vi.fn().mockResolvedValue({
    success: false,
    projects: [],
  }),
  promptMultipleProjectsWithValidation: vi.fn(),
  formatMultipleProjectsToString: vi.fn(),
}));

// Mock console methods
const mockConsoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});
const mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

describe('promptMissingArguments - Branch Selection Integration (Task 3.1)', () => {
  let mockInput: ReturnType<typeof vi.fn>;
  let mockConfirm: ReturnType<typeof vi.fn>;
  let mockPromptBranch: ReturnType<typeof vi.fn>;
  let mockFetchBranches: ReturnType<typeof vi.fn>;
  let mockFetchDefaultBranch: ReturnType<typeof vi.fn>;
  let mockLogger: PinoLogger;
  let mockClient: Octokit;

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
    steering: false,
  });

  beforeEach(async () => {
    const inquirer = await import('@inquirer/prompts');
    const branchPrompt = await import('@/cli/branch-prompt.js');
    const fetcher = await import('@/github/fetcher.js');

    mockInput = inquirer.input as ReturnType<typeof vi.fn>;
    mockConfirm = inquirer.confirm as ReturnType<typeof vi.fn>;
    mockPromptBranch = branchPrompt.promptBranch as ReturnType<typeof vi.fn>;
    mockFetchBranches = fetcher.fetchBranches as ReturnType<typeof vi.fn>;
    mockFetchDefaultBranch = fetcher.fetchDefaultBranch as ReturnType<typeof vi.fn>;

    // Setup default mocks
    mockInput.mockClear();
    mockConfirm.mockClear();
    mockPromptBranch.mockClear();
    mockFetchBranches.mockClear();
    mockFetchDefaultBranch.mockClear();
    mockConsoleLog.mockClear();
    mockConsoleError.mockClear();

    // Create mock logger
    mockLogger = {
      verbose: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      info: vi.fn(),
      debug: vi.fn(),
    } as unknown as PinoLogger;

    // Create mock Octokit client
    mockClient = {} as Octokit;

    // Ensure TTY is enabled for interactive tests
    Object.defineProperty(process.stdin, 'isTTY', {
      value: true,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Requirement 5.1: ブランチ指定チェック', () => {
    it('リポジトリに#branchが含まれる場合、ブランチ選択プロンプトをスキップする', async () => {
      mockInput
        .mockResolvedValueOnce('owner/repo#develop') // repository with branch
        .mockResolvedValueOnce('') // subdir
        .mockResolvedValueOnce('my-project') // project
        .mockResolvedValueOnce('.'); // output

      mockConfirm.mockResolvedValue(true);

      const args = createValidArgs();
      const result = await promptMissingArguments(args, undefined, mockLogger, false);

      // Branch selection should be skipped
      expect(mockFetchDefaultBranch).not.toHaveBeenCalled();
      expect(mockFetchBranches).not.toHaveBeenCalled();
      expect(mockPromptBranch).not.toHaveBeenCalled();

      // Repository should remain unchanged
      expect(result.repository).toBe('owner/repo#develop');
    });

    it('リポジトリに#branchが含まれない場合、ブランチ選択プロンプトを表示する', async () => {
      mockInput
        .mockResolvedValueOnce('owner/repo') // repository without branch
        .mockResolvedValueOnce('') // subdir
        .mockResolvedValueOnce('my-project') // project
        .mockResolvedValueOnce('.'); // output

      mockConfirm.mockResolvedValue(true);

      // Mock GitHub API calls
      mockFetchDefaultBranch.mockResolvedValue('main');
      mockFetchBranches.mockResolvedValue(['main', 'develop', 'feature/auth']);
      mockPromptBranch.mockResolvedValue('develop'); // User selects 'develop'

      const args = createValidArgs();
      const result = await promptMissingArguments(args, undefined, mockLogger, false);

      // Branch selection should be triggered
      expect(mockFetchDefaultBranch).toHaveBeenCalledWith(expect.any(Object), 'owner', 'repo');
      expect(mockFetchBranches).toHaveBeenCalledWith(expect.any(Object), 'owner', 'repo');
      expect(mockPromptBranch).toHaveBeenCalledWith(
        ['main', 'develop', 'feature/auth'],
        'main'
      );

      // Repository should have branch appended
      expect(result.repository).toBe('owner/repo#develop');
    });
  });

  describe('Requirement 5.3: ブランチ選択完了後の処理', () => {
    it('ユーザーがブランチを選択した場合、リポジトリ文字列に#branch形式で追加する', async () => {
      mockInput
        .mockResolvedValueOnce('owner/repo')
        .mockResolvedValueOnce('') // subdir
        .mockResolvedValueOnce('my-project')
        .mockResolvedValueOnce('.');

      mockConfirm.mockResolvedValue(true);

      mockFetchDefaultBranch.mockResolvedValue('main');
      mockFetchBranches.mockResolvedValue(['main', 'develop']);
      mockPromptBranch.mockResolvedValue('develop');

      const args = createValidArgs();
      const result = await promptMissingArguments(args, undefined, mockLogger, false);

      expect(result.repository).toBe('owner/repo#develop');
    });
  });

  describe('Requirement 5.5: 0件選択時のデフォルトブランチ使用', () => {
    it('ユーザーがブランチを0件選択した場合、デフォルトブランチを使用する', async () => {
      mockInput
        .mockResolvedValueOnce('owner/repo')
        .mockResolvedValueOnce('') // subdir
        .mockResolvedValueOnce('my-project')
        .mockResolvedValueOnce('.');

      mockConfirm.mockResolvedValue(true);

      mockFetchDefaultBranch.mockResolvedValue('main');
      mockFetchBranches.mockResolvedValue(['main', 'develop']);
      mockPromptBranch.mockResolvedValue(undefined); // 0 selections

      const args = createValidArgs();
      const result = await promptMissingArguments(args, undefined, mockLogger, false);

      expect(result.repository).toBe('owner/repo#main');
    });

    it('デフォルトブランチ取得失敗 + 0件選択の場合、ブランチ指定なしで継続', async () => {
      mockInput
        .mockResolvedValueOnce('owner/repo')
        .mockResolvedValueOnce('') // subdir
        .mockResolvedValueOnce('my-project')
        .mockResolvedValueOnce('.');

      mockConfirm.mockResolvedValue(true);

      mockFetchDefaultBranch.mockRejectedValue(new Error('API error'));
      mockFetchBranches.mockResolvedValue(['develop']);
      mockPromptBranch.mockResolvedValue(undefined); // 0 selections

      const args = createValidArgs();
      const result = await promptMissingArguments(args, undefined, mockLogger, false);

      // No branch should be appended
      expect(result.repository).toBe('owner/repo');
    });
  });

  describe('Requirement 7.2: デフォルトブランチ取得エラーハンドリング', () => {
    it('デフォルトブランチ取得失敗時もブランチ一覧取得は実行される', async () => {
      mockInput
        .mockResolvedValueOnce('owner/repo')
        .mockResolvedValueOnce('') // subdir
        .mockResolvedValueOnce('my-project')
        .mockResolvedValueOnce('.');

      mockConfirm.mockResolvedValue(true);

      mockFetchDefaultBranch.mockRejectedValue(new Error('404 Not Found'));
      mockFetchBranches.mockResolvedValue(['develop', 'feature/auth']);
      mockPromptBranch.mockResolvedValue('develop');

      const args = createValidArgs();
      const result = await promptMissingArguments(args, undefined, mockLogger, true);

      // Both should be called
      expect(mockFetchDefaultBranch).toHaveBeenCalled();
      expect(mockFetchBranches).toHaveBeenCalled();
      expect(mockPromptBranch).toHaveBeenCalledWith(['develop', 'feature/auth'], undefined);

      // Should log debug message
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Failed to fetch default branch',
        expect.any(Object)
      );

      expect(result.repository).toBe('owner/repo#develop');
    });
  });

  describe('Requirement 7.3: ブランチ一覧取得エラーハンドリング', () => {
    it('ブランチ一覧取得失敗時はデフォルトブランチにフォールバック', async () => {
      mockInput
        .mockResolvedValueOnce('owner/repo')
        .mockResolvedValueOnce('') // subdir
        .mockResolvedValueOnce('my-project')
        .mockResolvedValueOnce('.');

      mockConfirm.mockResolvedValue(true);

      mockFetchDefaultBranch.mockResolvedValue('main');
      mockFetchBranches.mockRejectedValue(new Error('Network error'));

      const args = createValidArgs();
      const result = await promptMissingArguments(args, undefined, mockLogger, true);

      // Error message should be displayed
      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringContaining('Failed to fetch branches')
      );

      // Fallback to default branch
      expect(result.repository).toBe('owner/repo#main');

      // Should log debug message
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Failed to fetch branches',
        expect.any(Object)
      );
    });

    it('ブランチ一覧が0件の場合、エラーメッセージを表示してプロンプトをスキップ', async () => {
      mockInput
        .mockResolvedValueOnce('owner/repo')
        .mockResolvedValueOnce('') // subdir
        .mockResolvedValueOnce('my-project')
        .mockResolvedValueOnce('.');

      mockConfirm.mockResolvedValue(true);

      mockFetchDefaultBranch.mockResolvedValue('main');
      mockFetchBranches.mockResolvedValue([]); // Empty branches

      const args = createValidArgs();
      const result = await promptMissingArguments(args, undefined, mockLogger, false);

      // Error message should be displayed
      expect(mockConsoleError).toHaveBeenCalledWith('No branches found in repository');

      // Prompt should be skipped
      expect(mockPromptBranch).not.toHaveBeenCalled();

      // No branch appended
      expect(result.repository).toBe('owner/repo');
    });
  });

  describe('Requirement 11.3, 11.4: Verboseモードログ記録', () => {
    it('デフォルトブランチ取得成功時にverboseログを記録', async () => {
      mockInput
        .mockResolvedValueOnce('owner/repo')
        .mockResolvedValueOnce('') // subdir
        .mockResolvedValueOnce('my-project')
        .mockResolvedValueOnce('.');

      mockConfirm.mockResolvedValue(true);

      mockFetchDefaultBranch.mockResolvedValue('main');
      mockFetchBranches.mockResolvedValue(['main', 'develop']);
      mockPromptBranch.mockResolvedValue('develop');

      const args = createValidArgs();
      await promptMissingArguments(args, undefined, mockLogger, true); // verbose: true

      expect(mockLogger.debug).toHaveBeenCalledWith('Default branch detected', {
        defaultBranch: 'main',
      });
    });

    it('ブランチ選択完了時にverboseログを記録', async () => {
      mockInput
        .mockResolvedValueOnce('owner/repo')
        .mockResolvedValueOnce('') // subdir
        .mockResolvedValueOnce('my-project')
        .mockResolvedValueOnce('.');

      mockConfirm.mockResolvedValue(true);

      mockFetchDefaultBranch.mockResolvedValue('main');
      mockFetchBranches.mockResolvedValue(['main', 'develop']);
      mockPromptBranch.mockResolvedValue('develop');

      const args = createValidArgs();
      await promptMissingArguments(args, undefined, mockLogger, true); // verbose: true

      expect(mockLogger.debug).toHaveBeenCalledWith('Branch selected', {
        branch: 'develop',
      });
    });
  });

  describe('非対話モード動作保証 (Requirement 8)', () => {
    it('Loggerが提供されていない場合、ブランチ選択プロンプトを表示しない', async () => {
      mockInput
        .mockResolvedValueOnce('owner/repo')
        .mockResolvedValueOnce('') // subdir
        .mockResolvedValueOnce('my-project')
        .mockResolvedValueOnce('.');

      mockConfirm.mockResolvedValue(true);

      const args = createValidArgs();
      const result = await promptMissingArguments(args, undefined, undefined, false); // No logger

      // Branch selection should be skipped
      expect(mockFetchDefaultBranch).not.toHaveBeenCalled();
      expect(mockFetchBranches).not.toHaveBeenCalled();
      expect(mockPromptBranch).not.toHaveBeenCalled();

      expect(result.repository).toBe('owner/repo');
    });

    it('プロジェクトが既に指定されている場合でも、ブランチ選択プロンプトは表示される（対話モード）', async () => {
      mockInput
        .mockResolvedValueOnce('owner/repo')
        .mockResolvedValueOnce(''); // subdir

      mockConfirm.mockResolvedValue(true);

      // Mock branch selection
      mockFetchDefaultBranch.mockResolvedValue('main');
      mockFetchBranches.mockResolvedValue(['main', 'develop']);
      mockPromptBranch.mockResolvedValue('main');

      const args = createValidArgs({ projects: ['existing-project'] });
      const result = await promptMissingArguments(args, undefined, mockLogger, false);

      // Branch selection should still occur in interactive mode, regardless of project status
      expect(mockFetchDefaultBranch).toHaveBeenCalled();
      expect(mockFetchBranches).toHaveBeenCalled();
      expect(mockPromptBranch).toHaveBeenCalled();

      expect(result.repository).toBe('owner/repo#main');
    });

    it('TTY環境でない場合、ブランチ選択プロンプトを表示しない (Requirement 8.3)', async () => {
      // Set TTY to false (non-interactive environment)
      Object.defineProperty(process.stdin, 'isTTY', {
        value: false,
        configurable: true,
      });

      mockInput
        .mockResolvedValueOnce('owner/repo')
        .mockResolvedValueOnce('') // subdir
        .mockResolvedValueOnce('my-project')
        .mockResolvedValueOnce('.');

      mockConfirm.mockResolvedValue(true);

      const args = createValidArgs();
      const result = await promptMissingArguments(args, undefined, mockLogger, false);

      // Branch selection should be skipped in non-TTY environment
      expect(mockFetchDefaultBranch).not.toHaveBeenCalled();
      expect(mockFetchBranches).not.toHaveBeenCalled();
      expect(mockPromptBranch).not.toHaveBeenCalled();

      expect(result.repository).toBe('owner/repo');

      // Restore TTY for other tests
      Object.defineProperty(process.stdin, 'isTTY', {
        value: true,
        configurable: true,
      });
    });
  });

  describe('ローディングメッセージ表示 (Requirement 9.5)', () => {
    it('ブランチ取得中にローディングメッセージを表示', async () => {
      mockInput
        .mockResolvedValueOnce('owner/repo')
        .mockResolvedValueOnce('') // subdir
        .mockResolvedValueOnce('my-project')
        .mockResolvedValueOnce('.');

      mockConfirm.mockResolvedValue(true);

      mockFetchDefaultBranch.mockResolvedValue('main');
      mockFetchBranches.mockResolvedValue(['main', 'develop']);
      mockPromptBranch.mockResolvedValue('develop');

      const args = createValidArgs();
      await promptMissingArguments(args, undefined, mockLogger, false);

      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('Fetching branches'));
    });
  });

  describe('Requirement 11.1, 11.2: ブランチ一覧取得成功時のverboseログ記録', () => {
    it('ブランチ一覧取得成功時にverboseモードでブランチ数をログに記録', async () => {
      mockInput
        .mockResolvedValueOnce('owner/repo')
        .mockResolvedValueOnce('') // subdir
        .mockResolvedValueOnce('my-project')
        .mockResolvedValueOnce('.');

      mockConfirm.mockResolvedValue(true);

      mockFetchDefaultBranch.mockResolvedValue('main');
      mockFetchBranches.mockResolvedValue(['main', 'develop', 'feature/auth']);
      mockPromptBranch.mockResolvedValue('develop');

      const args = createValidArgs();
      await promptMissingArguments(args, undefined, mockLogger, true); // verbose: true

      expect(mockLogger.debug).toHaveBeenCalledWith('Fetched branches', {
        count: 3,
      });
    });

    it('ブランチ一覧が0件の場合はverboseログを記録しない', async () => {
      mockInput
        .mockResolvedValueOnce('owner/repo')
        .mockResolvedValueOnce('') // subdir
        .mockResolvedValueOnce('my-project')
        .mockResolvedValueOnce('.');

      mockConfirm.mockResolvedValue(true);

      mockFetchDefaultBranch.mockResolvedValue('main');
      mockFetchBranches.mockResolvedValue([]); // Empty branches

      const args = createValidArgs();
      await promptMissingArguments(args, undefined, mockLogger, true); // verbose: true

      // Should not log branch count for empty branches
      expect(mockLogger.debug).not.toHaveBeenCalledWith('Fetched branches', expect.any(Object));
    });
  });

  describe('Requirement 10.1, Task 3.5: Tree API連携テスト', () => {
    it('ブランチが適用されたリポジトリ文字列でTree API検索が実行される', async () => {
      mockInput
        .mockResolvedValueOnce('owner/repo') // repository without branch
        .mockResolvedValueOnce('') // subdir
        .mockResolvedValueOnce('my-project') // project (Tree API fails, so manual prompt)
        .mockResolvedValueOnce('.'); // output

      mockConfirm.mockResolvedValue(true);

      // Mock branch selection
      mockFetchDefaultBranch.mockResolvedValue('main');
      mockFetchBranches.mockResolvedValue(['main', 'develop']);
      mockPromptBranch.mockResolvedValue('develop'); // User selects 'develop'

      const args = createValidArgs();
      await promptMissingArguments(args, undefined, mockLogger, false);

      // Import the mocked scanProjectsAcrossSubdirs to verify it was called
      const { scanProjectsAcrossSubdirs } = await import('@/github/tree-based-project-scanner.js');

      // Verify Tree API was called with branch-applied repository string
      expect(scanProjectsAcrossSubdirs).toHaveBeenCalledWith(
        expect.objectContaining({
          repository: expect.objectContaining({
            owner: 'owner',
            repo: 'repo',
            branch: 'develop', // Branch should be applied
          }),
        })
      );
    });

    it('ブランチ指定済みリポジトリでもTree API検索にブランチが渡される', async () => {
      mockInput
        .mockResolvedValueOnce('owner/repo#feature') // repository with branch
        .mockResolvedValueOnce('') // subdir
        .mockResolvedValueOnce('my-project') // project (Tree API fails, so manual prompt)
        .mockResolvedValueOnce('.'); // output

      mockConfirm.mockResolvedValue(true);

      const args = createValidArgs();
      await promptMissingArguments(args, undefined, mockLogger, false);

      // Import the mocked scanProjectsAcrossSubdirs
      const { scanProjectsAcrossSubdirs } = await import('@/github/tree-based-project-scanner.js');

      // Verify Tree API was called with the specified branch
      expect(scanProjectsAcrossSubdirs).toHaveBeenCalledWith(
        expect.objectContaining({
          repository: expect.objectContaining({
            owner: 'owner',
            repo: 'repo',
            branch: 'feature', // Pre-specified branch should be preserved
          }),
        })
      );
    });
  });
});
