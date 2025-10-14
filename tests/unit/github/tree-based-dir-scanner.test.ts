/**
 * Unit tests for TreeBasedDirectoryScanner (Task 9.1)
 * Requirements: 9.1, 9.7
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Octokit } from 'octokit';
import type { Logger } from '../../../src/reporting/logger.js';
import type { RepositoryRef } from '../../../src/github/fetcher.js';
import {
  scanDirectoriesAcrossRepo,
  type DirectoryScanOptions,
  type DirectoryScanResult,
} from '../../../src/github/tree-based-dir-scanner.js';

// Mock Octokit
vi.mock('octokit');

describe('TreeBasedDirectoryScanner (Task 9.1)', () => {
  let mockOctokit: any;
  let mockLogger: Logger;
  let repository: RepositoryRef;

  beforeEach(() => {
    // Setup mock logger
    mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      verbose: vi.fn(),
      debug: vi.fn(),
    } as unknown as Logger;

    // Setup repository reference
    repository = {
      owner: 'test-owner',
      repo: 'test-repo',
      branch: 'main',
    };

    // Setup mock Octokit
    mockOctokit = {
      rest: {
        repos: {
          getBranch: vi.fn(),
        },
        git: {
          getTree: vi.fn(),
        },
      },
    };

    (Octokit as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => mockOctokit);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Tree API directory scanning (Requirement 9.1)', () => {
    it('should successfully scan directories from Tree API', async () => {
      // Arrange: Mock branch and tree responses
      mockOctokit.rest.repos.getBranch.mockResolvedValueOnce({
        data: {
          commit: {
            sha: 'branch-commit-sha',
            commit: {
              tree: {
                sha: 'tree-sha-abc123',
              },
            },
          },
        },
      });

      mockOctokit.rest.git.getTree.mockResolvedValueOnce({
        data: {
          sha: 'tree-sha-abc123',
          tree: [
            { path: 'src', type: 'tree', sha: 'sha1' },
            { path: 'src/cli', type: 'tree', sha: 'sha2' },
            { path: 'src/github', type: 'tree', sha: 'sha3' },
            { path: 'README.md', type: 'blob', sha: 'sha4' }, // File (should be filtered out)
            { path: 'package.json', type: 'blob', sha: 'sha5' }, // File (should be filtered out)
          ],
          truncated: false,
        },
      });

      const options: DirectoryScanOptions = {
        repository,
        client: mockOctokit as Octokit,
        logger: mockLogger,
        verbose: true,
      };

      // Act
      const result: DirectoryScanResult = await scanDirectoriesAcrossRepo(options);

      // Assert
      expect(result.success).toBe(true);
      expect(result.directories).toHaveLength(3);
      expect(result.directories).toEqual([
        { path: 'src', displayName: 'src', sha: 'sha1' },
        { path: 'src/cli', displayName: 'src/cli', sha: 'sha2' },
        { path: 'src/github', displayName: 'src/github', sha: 'sha3' },
      ]);
      expect(result.truncated).toBe(false);
      expect(result.errorMessage).toBeUndefined();
    });

    it('should filter out files (type === "blob") and keep only directories (type === "tree")', async () => {
      // Arrange
      mockOctokit.rest.repos.getBranch.mockResolvedValueOnce({
        data: {
          commit: {
            sha: 'branch-commit-sha',
            commit: {
              tree: {
                sha: 'tree-sha-abc123',
              },
            },
          },
        },
      });

      mockOctokit.rest.git.getTree.mockResolvedValueOnce({
        data: {
          sha: 'tree-sha-abc123',
          tree: [
            { path: 'dir1', type: 'tree', sha: 'sha1' },
            { path: 'file1.txt', type: 'blob', sha: 'sha2' },
            { path: 'dir2', type: 'tree', sha: 'sha3' },
            { path: 'file2.md', type: 'blob', sha: 'sha4' },
          ],
          truncated: false,
        },
      });

      const options: DirectoryScanOptions = {
        repository,
        client: mockOctokit as Octokit,
        logger: mockLogger,
        verbose: false,
      };

      // Act
      const result = await scanDirectoriesAcrossRepo(options);

      // Assert
      expect(result.success).toBe(true);
      expect(result.directories).toHaveLength(2);
      expect(result.directories).toEqual([
        { path: 'dir1', displayName: 'dir1', sha: 'sha1' },
        { path: 'dir2', displayName: 'dir2', sha: 'sha3' },
      ]);
    });

    it('should detect truncated Tree API response (Requirement 9.1)', async () => {
      // Arrange
      mockOctokit.rest.repos.getBranch.mockResolvedValueOnce({
        data: {
          commit: {
            sha: 'branch-commit-sha',
            commit: {
              tree: {
                sha: 'tree-sha-abc123',
              },
            },
          },
        },
      });

      mockOctokit.rest.git.getTree.mockResolvedValueOnce({
        data: {
          sha: 'tree-sha-abc123',
          tree: [
            { path: 'dir1', type: 'tree', sha: 'sha1' },
            { path: 'dir2', type: 'tree', sha: 'sha2' },
          ],
          truncated: true, // Repository is very large
        },
      });

      const options: DirectoryScanOptions = {
        repository,
        client: mockOctokit as Octokit,
        logger: mockLogger,
        verbose: true,
      };

      // Act
      const result = await scanDirectoriesAcrossRepo(options);

      // Assert
      expect(result.success).toBe(true);
      expect(result.truncated).toBe(true);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Repository is very large, some directories may not be shown'
      );
    });

    it('should not log warning for truncated response when verbose is false', async () => {
      // Arrange
      mockOctokit.rest.repos.getBranch.mockResolvedValueOnce({
        data: {
          commit: {
            sha: 'branch-commit-sha',
            commit: {
              tree: {
                sha: 'tree-sha-abc123',
              },
            },
          },
        },
      });

      mockOctokit.rest.git.getTree.mockResolvedValueOnce({
        data: {
          sha: 'tree-sha-abc123',
          tree: [{ path: 'dir1', type: 'tree', sha: 'sha1' }],
          truncated: true,
        },
      });

      const options: DirectoryScanOptions = {
        repository,
        client: mockOctokit as Octokit,
        logger: mockLogger,
        verbose: false,
      };

      // Act
      const result = await scanDirectoriesAcrossRepo(options);

      // Assert
      expect(result.success).toBe(true);
      expect(result.truncated).toBe(true);
      expect(mockLogger.warn).not.toHaveBeenCalled();
    });
  });

  describe('Error handling (Requirement 9.7)', () => {
    it('should handle 404 error (repository not found)', async () => {
      // Arrange
      const error = new Error('Not Found');
      (error as any).status = 404;
      mockOctokit.rest.repos.getBranch.mockRejectedValueOnce(error);

      const options: DirectoryScanOptions = {
        repository,
        client: mockOctokit as Octokit,
        logger: mockLogger,
        verbose: false,
      };

      // Act
      const result = await scanDirectoriesAcrossRepo(options);

      // Assert
      expect(result.success).toBe(false);
      expect(result.directories).toEqual([]);
      expect(result.truncated).toBe(false);
      expect(result.errorMessage).toContain('Repository or branch not found');
    });

    it('should handle 403 error (authentication error)', async () => {
      // Arrange
      const error = new Error('Forbidden');
      (error as any).status = 403;
      mockOctokit.rest.repos.getBranch.mockRejectedValueOnce(error);

      const options: DirectoryScanOptions = {
        repository,
        client: mockOctokit as Octokit,
        logger: mockLogger,
        verbose: false,
      };

      // Act
      const result = await scanDirectoriesAcrossRepo(options);

      // Assert
      expect(result.success).toBe(false);
      expect(result.directories).toEqual([]);
      expect(result.errorMessage).toContain('Authentication error');
    });

    it('should handle network error (no status code)', async () => {
      // Arrange
      const error = new Error('Network request failed');
      mockOctokit.rest.repos.getBranch.mockRejectedValueOnce(error);

      const options: DirectoryScanOptions = {
        repository,
        client: mockOctokit as Octokit,
        logger: mockLogger,
        verbose: false,
      };

      // Act
      const result = await scanDirectoriesAcrossRepo(options);

      // Assert
      expect(result.success).toBe(false);
      expect(result.directories).toEqual([]);
      expect(result.errorMessage).toContain('Failed to scan directories');
    });

    it('should handle Tree API error', async () => {
      // Arrange
      mockOctokit.rest.repos.getBranch.mockResolvedValueOnce({
        data: {
          commit: {
            sha: 'branch-commit-sha',
            commit: {
              tree: {
                sha: 'tree-sha-abc123',
              },
            },
          },
        },
      });

      const error = new Error('Internal server error');
      (error as any).status = 500;
      mockOctokit.rest.git.getTree.mockRejectedValueOnce(error);

      const options: DirectoryScanOptions = {
        repository,
        client: mockOctokit as Octokit,
        logger: mockLogger,
        verbose: false,
      };

      // Act
      const result = await scanDirectoriesAcrossRepo(options);

      // Assert
      expect(result.success).toBe(false);
      expect(result.directories).toEqual([]);
      expect(result.errorMessage).toBeDefined();
    });
  });

  describe('Verbose logging', () => {
    it('should log verbose messages when verbose is true', async () => {
      // Arrange
      mockOctokit.rest.repos.getBranch.mockResolvedValueOnce({
        data: {
          commit: {
            sha: 'branch-commit-sha',
            commit: {
              tree: {
                sha: 'tree-sha-abc123',
              },
            },
          },
        },
      });

      mockOctokit.rest.git.getTree.mockResolvedValueOnce({
        data: {
          sha: 'tree-sha-abc123',
          tree: [{ path: 'dir1', type: 'tree', sha: 'sha1' }],
          truncated: false,
        },
      });

      const options: DirectoryScanOptions = {
        repository,
        client: mockOctokit as Octokit,
        logger: mockLogger,
        verbose: true,
      };

      // Act
      await scanDirectoriesAcrossRepo(options);

      // Assert
      expect(mockLogger.verbose).toHaveBeenCalledWith(
        expect.stringContaining('Fetching tree SHA')
      );
      expect(mockLogger.verbose).toHaveBeenCalledWith(
        expect.stringContaining('Fetching repository tree')
      );
    });

    it('should not log verbose messages when verbose is false', async () => {
      // Arrange
      mockOctokit.rest.repos.getBranch.mockResolvedValueOnce({
        data: {
          commit: {
            sha: 'branch-commit-sha',
            commit: {
              tree: {
                sha: 'tree-sha-abc123',
              },
            },
          },
        },
      });

      mockOctokit.rest.git.getTree.mockResolvedValueOnce({
        data: {
          sha: 'tree-sha-abc123',
          tree: [{ path: 'dir1', type: 'tree', sha: 'sha1' }],
          truncated: false,
        },
      });

      const options: DirectoryScanOptions = {
        repository,
        client: mockOctokit as Octokit,
        logger: mockLogger,
        verbose: false,
      };

      // Act
      await scanDirectoriesAcrossRepo(options);

      // Assert
      expect(mockLogger.verbose).not.toHaveBeenCalled();
    });
  });
});
