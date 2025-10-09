/**
 * Project Suggester Service Test
 *
 * Tests for ProjectSuggester service
 * Task 1.1: プロジェクトサジェスターサービスのコア機能を実装
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Octokit } from 'octokit';
import type { Logger } from '@/reporting/logger.js';

// Mock fetchDirectoryContents
vi.mock('@/github/fetcher.js', () => ({
  fetchDirectoryContents: vi.fn(),
}));

describe('ProjectSuggester', () => {
  let mockClient: Octokit;
  let mockLogger: Logger;
  let mockFetchDirectoryContents: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    // Create mock client and logger
    mockClient = {} as Octokit;
    mockLogger = {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    } as unknown as Logger;

    // Import and setup mock
    const fetcher = await import('@/github/fetcher.js');
    mockFetchDirectoryContents = fetcher.fetchDirectoryContents as ReturnType<
      typeof vi.fn
    >;
    mockFetchDirectoryContents.mockClear();
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
        '.kiro/specs/',
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
        'lib/a/.kiro/specs/',
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
        '.kiro/specs/',
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
    it('404エラー時はフォールバックフラグを設定する', async () => {
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
    });

    it('401エラー時はフォールバックフラグを設定する', async () => {
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
    });

    it('403エラー時はフォールバックフラグを設定する', async () => {
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
    });

    it('その他のエラー時はフォールバックフラグを設定する', async () => {
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
    });

    it('空ディレクトリの場合はフォールバックフラグを設定する', async () => {
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
    });

    it('ファイルのみでディレクトリがない場合はフォールバックフラグを設定する', async () => {
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
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Fetching available projects'),
        expect.objectContaining({
          repository: 'test-owner/test-repo',
          branch: 'main',
          path: '.kiro/specs/',
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
      expect(mockLogger.info).toHaveBeenCalledWith(
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
      expect(mockLogger.error).toHaveBeenCalledWith(
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
});
