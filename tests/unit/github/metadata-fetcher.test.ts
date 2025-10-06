/**
 * GitHub Metadata Fetcher Unit Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Octokit } from 'octokit';
import {
  fetchFileMetadata,
  GitHubMetadataError,
  GitHubMetadataErrorType,
} from '../../../src/github/metadata-fetcher.js';

describe('GitHubMetadataFetcher - fetchFileMetadata', () => {
  let mockOctokit: Octokit;

  beforeEach(() => {
    // Create mock Octokit client
    mockOctokit = {
      rest: {
        repos: {
          getContent: vi.fn(),
        },
      },
    } as unknown as Octokit;
  });

  describe('正常系: ファイルメタデータ取得', () => {
    it('ファイルのSHAとサイズのみを取得できる', async () => {
      // Arrange
      const owner = 'test-owner';
      const repo = 'test-repo';
      const path = '.kiro/specs/feature/requirements.md';

      vi.mocked(mockOctokit.rest.repos.getContent).mockResolvedValue({
        data: {
          name: 'requirements.md',
          path: '.kiro/specs/feature/requirements.md',
          sha: 'abc123def456',
          size: 1024,
          type: 'file',
          content: 'base64encodedcontent', // Should NOT be used
          encoding: 'base64',
        },
        status: 200,
        url: 'https://api.github.com',
        headers: {},
      } as any);

      // Act
      const result = await fetchFileMetadata(mockOctokit, owner, repo, path);

      // Assert
      expect(result).toEqual({
        path: '.kiro/specs/feature/requirements.md',
        sha: 'abc123def456',
        size: 1024,
      });

      // Verify API was called correctly
      expect(mockOctokit.rest.repos.getContent).toHaveBeenCalledWith({
        owner,
        repo,
        path,
      });
      expect(mockOctokit.rest.repos.getContent).toHaveBeenCalledTimes(1);
    });

    it('異なるファイルパスでメタデータを取得できる', async () => {
      // Arrange
      const owner = 'owner';
      const repo = 'repo';
      const path = '.kiro/steering/tech.md';

      vi.mocked(mockOctokit.rest.repos.getContent).mockResolvedValue({
        data: {
          name: 'tech.md',
          path: '.kiro/steering/tech.md',
          sha: 'xyz789',
          size: 2048,
          type: 'file',
        },
        status: 200,
        url: 'https://api.github.com',
        headers: {},
      } as any);

      // Act
      const result = await fetchFileMetadata(mockOctokit, owner, repo, path);

      // Assert
      expect(result.path).toBe('.kiro/steering/tech.md');
      expect(result.sha).toBe('xyz789');
      expect(result.size).toBe(2048);
    });

    it('サイズ0のファイルのメタデータを取得できる', async () => {
      // Arrange
      const owner = 'owner';
      const repo = 'repo';
      const path = 'empty.txt';

      vi.mocked(mockOctokit.rest.repos.getContent).mockResolvedValue({
        data: {
          name: 'empty.txt',
          path: 'empty.txt',
          sha: 'empty123',
          size: 0,
          type: 'file',
        },
        status: 200,
        url: 'https://api.github.com',
        headers: {},
      } as any);

      // Act
      const result = await fetchFileMetadata(mockOctokit, owner, repo, path);

      // Assert
      expect(result.size).toBe(0);
      expect(result.sha).toBe('empty123');
    });

    it('大容量ファイル（1MB超）のメタデータを取得できる', async () => {
      // Arrange
      const owner = 'owner';
      const repo = 'repo';
      const path = 'large-file.bin';

      vi.mocked(mockOctokit.rest.repos.getContent).mockResolvedValue({
        data: {
          name: 'large-file.bin',
          path: 'large-file.bin',
          sha: 'large789',
          size: 2 * 1024 * 1024, // 2MB
          type: 'file',
        },
        status: 200,
        url: 'https://api.github.com',
        headers: {},
      } as any);

      // Act
      const result = await fetchFileMetadata(mockOctokit, owner, repo, path);

      // Assert
      expect(result.size).toBe(2 * 1024 * 1024);
    });
  });

  describe('異常系: ファイル不存在（404エラー）', () => {
    it('ファイルが存在しない場合にFILE_NOT_FOUNDエラーを投げる', async () => {
      // Arrange
      const owner = 'owner';
      const repo = 'repo';
      const path = 'non-existent.md';

      const notFoundError = new Error('Not Found');
      (notFoundError as any).status = 404;

      vi.mocked(mockOctokit.rest.repos.getContent).mockRejectedValue(notFoundError);

      // Act & Assert
      await expect(fetchFileMetadata(mockOctokit, owner, repo, path)).rejects.toThrow(
        GitHubMetadataError
      );

      await expect(fetchFileMetadata(mockOctokit, owner, repo, path)).rejects.toMatchObject({
        type: GitHubMetadataErrorType.FILE_NOT_FOUND,
        message: expect.stringContaining('File not found'),
      });
    });

    it('リポジトリが存在しない場合にFILE_NOT_FOUNDエラーを投げる', async () => {
      // Arrange
      const owner = 'non-existent-owner';
      const repo = 'non-existent-repo';
      const path = 'file.md';

      const notFoundError = new Error('Not Found');
      (notFoundError as any).status = 404;

      vi.mocked(mockOctokit.rest.repos.getContent).mockRejectedValue(notFoundError);

      // Act & Assert
      await expect(fetchFileMetadata(mockOctokit, owner, repo, path)).rejects.toMatchObject({
        type: GitHubMetadataErrorType.FILE_NOT_FOUND,
      });
    });
  });

  describe('異常系: レート制限エラー（403/429）', () => {
    it('レート制限エラー（403）時にRATE_LIMITエラーを投げる', async () => {
      // Arrange
      const owner = 'owner';
      const repo = 'repo';
      const path = 'file.md';

      const rateLimitError = new Error('Rate limit exceeded');
      (rateLimitError as any).status = 403;

      vi.mocked(mockOctokit.rest.repos.getContent).mockRejectedValue(rateLimitError);

      // Act & Assert
      await expect(fetchFileMetadata(mockOctokit, owner, repo, path)).rejects.toThrow(
        GitHubMetadataError
      );

      await expect(fetchFileMetadata(mockOctokit, owner, repo, path)).rejects.toMatchObject({
        type: GitHubMetadataErrorType.RATE_LIMIT,
        message: expect.stringContaining('Rate limit'),
      });
    });

    it('レート制限エラー（429）時にRATE_LIMITエラーを投げる', async () => {
      // Arrange
      const owner = 'owner';
      const repo = 'repo';
      const path = 'file.md';

      const rateLimitError = new Error('Too Many Requests');
      (rateLimitError as any).status = 429;

      vi.mocked(mockOctokit.rest.repos.getContent).mockRejectedValue(rateLimitError);

      // Act & Assert
      await expect(fetchFileMetadata(mockOctokit, owner, repo, path)).rejects.toMatchObject({
        type: GitHubMetadataErrorType.RATE_LIMIT,
      });
    });
  });

  describe('異常系: ディレクトリ指定', () => {
    it('ディレクトリを指定した場合にINVALID_TYPEエラーを投げる', async () => {
      // Arrange
      const owner = 'owner';
      const repo = 'repo';
      const path = '.kiro/specs';

      vi.mocked(mockOctokit.rest.repos.getContent).mockResolvedValue({
        data: [
          {
            name: 'feature1',
            path: '.kiro/specs/feature1',
            type: 'dir',
            sha: 'dir123',
          },
        ],
        status: 200,
        url: 'https://api.github.com',
        headers: {},
      } as any);

      // Act & Assert
      await expect(fetchFileMetadata(mockOctokit, owner, repo, path)).rejects.toThrow(
        GitHubMetadataError
      );

      await expect(fetchFileMetadata(mockOctokit, owner, repo, path)).rejects.toMatchObject({
        type: GitHubMetadataErrorType.INVALID_TYPE,
        message: expect.stringContaining('not a file'),
      });
    });
  });

  describe('異常系: その他のAPIエラー', () => {
    it('認証エラー（401）時にAPI_ERRORを投げる', async () => {
      // Arrange
      const owner = 'owner';
      const repo = 'repo';
      const path = 'file.md';

      const authError = new Error('Unauthorized');
      (authError as any).status = 401;

      vi.mocked(mockOctokit.rest.repos.getContent).mockRejectedValue(authError);

      // Act & Assert
      await expect(fetchFileMetadata(mockOctokit, owner, repo, path)).rejects.toMatchObject({
        type: GitHubMetadataErrorType.API_ERROR,
      });
    });

    it('サーバーエラー（500）時にAPI_ERRORを投げる', async () => {
      // Arrange
      const owner = 'owner';
      const repo = 'repo';
      const path = 'file.md';

      const serverError = new Error('Internal Server Error');
      (serverError as any).status = 500;

      vi.mocked(mockOctokit.rest.repos.getContent).mockRejectedValue(serverError);

      // Act & Assert
      await expect(fetchFileMetadata(mockOctokit, owner, repo, path)).rejects.toMatchObject({
        type: GitHubMetadataErrorType.API_ERROR,
      });
    });

    it('ネットワークエラー時にAPI_ERRORを投げる', async () => {
      // Arrange
      const owner = 'owner';
      const repo = 'repo';
      const path = 'file.md';

      const networkError = new Error('Network error');

      vi.mocked(mockOctokit.rest.repos.getContent).mockRejectedValue(networkError);

      // Act & Assert
      await expect(fetchFileMetadata(mockOctokit, owner, repo, path)).rejects.toMatchObject({
        type: GitHubMetadataErrorType.API_ERROR,
      });
    });
  });

  describe('エラーオブジェクトの構造', () => {
    it('GitHubMetadataErrorは必須フィールドを含む', async () => {
      // Arrange
      const owner = 'owner';
      const repo = 'repo';
      const path = 'non-existent.md';

      const notFoundError = new Error('Not Found');
      (notFoundError as any).status = 404;

      vi.mocked(mockOctokit.rest.repos.getContent).mockRejectedValue(notFoundError);

      // Act & Assert
      try {
        await fetchFileMetadata(mockOctokit, owner, repo, path);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(GitHubMetadataError);
        expect(error).toHaveProperty('type');
        expect(error).toHaveProperty('message');
        expect(error).toHaveProperty('path');
        expect((error as GitHubMetadataError).path).toBe(path);
      }
    });

    it('GitHubMetadataErrorはエラー詳細を含む', async () => {
      // Arrange
      const owner = 'owner';
      const repo = 'repo';
      const path = 'file.md';

      const detailedError = new Error('Detailed error message');
      (detailedError as any).status = 500;

      vi.mocked(mockOctokit.rest.repos.getContent).mockRejectedValue(detailedError);

      // Act & Assert
      try {
        await fetchFileMetadata(mockOctokit, owner, repo, path);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toHaveProperty('details');
        expect((error as GitHubMetadataError).details).toContain('Detailed error message');
      }
    });
  });

  describe('APIコール最適化', () => {
    it('コンテンツをダウンロードせずにメタデータのみ取得する', async () => {
      // Arrange
      const owner = 'owner';
      const repo = 'repo';
      const path = 'file.md';

      vi.mocked(mockOctokit.rest.repos.getContent).mockResolvedValue({
        data: {
          name: 'file.md',
          path: 'file.md',
          sha: 'sha123',
          size: 1024,
          type: 'file',
          content: 'VGhpcyBzaG91bGQgbm90IGJlIGRlY29kZWQ=', // "This should not be decoded"
          encoding: 'base64',
        },
        status: 200,
        url: 'https://api.github.com',
        headers: {},
      } as any);

      // Act
      const result = await fetchFileMetadata(mockOctokit, owner, repo, path);

      // Assert - content should NOT be in the result
      expect(result).not.toHaveProperty('content');
      expect(result).toEqual({
        path: 'file.md',
        sha: 'sha123',
        size: 1024,
      });
    });

    it('1回のAPIコールで完了する', async () => {
      // Arrange
      const owner = 'owner';
      const repo = 'repo';
      const path = 'file.md';

      vi.mocked(mockOctokit.rest.repos.getContent).mockResolvedValue({
        data: {
          name: 'file.md',
          path: 'file.md',
          sha: 'sha123',
          size: 1024,
          type: 'file',
        },
        status: 200,
        url: 'https://api.github.com',
        headers: {},
      } as any);

      // Act
      await fetchFileMetadata(mockOctokit, owner, repo, path);

      // Assert - should only call API once
      expect(mockOctokit.rest.repos.getContent).toHaveBeenCalledTimes(1);
    });
  });
});
