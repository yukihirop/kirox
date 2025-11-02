/**
 * Unit tests for TreeBasedDirectoryScanner (Task 9.1)
 * Requirements: 9.1, 9.7
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Octokit } from 'octokit';
import type { PinoLogger } from '../../../src/reporting/pino-logger.js';
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
  let mockLogger: PinoLogger;
  let repository: RepositoryRef;

  beforeEach(() => {
    // Setup mock logger
    mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      verbose: vi.fn(),
      debug: vi.fn(),
    } as unknown as PinoLogger;

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
            { path: 'src/.kiro', type: 'tree', sha: 'sha2' },
            { path: 'src/.kiro/steering', type: 'tree', sha: 'sha3' },
            { path: 'lib', type: 'tree', sha: 'sha4' },
            { path: 'lib/.kiro', type: 'tree', sha: 'sha5' },
            { path: 'lib/.kiro/steering', type: 'tree', sha: 'sha6' },
            { path: 'docs', type: 'tree', sha: 'sha7' },
            { path: 'docs/.kiro', type: 'tree', sha: 'sha8' },
            { path: 'docs/.kiro/steering', type: 'tree', sha: 'sha9' },
            { path: 'README.md', type: 'blob', sha: 'sha10' }, // File (should be filtered out)
            { path: 'package.json', type: 'blob', sha: 'sha11' }, // File (should be filtered out)
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

      // Assert: Should return parent directories where .kiro/steering exists
      expect(result.success).toBe(true);
      expect(result.directories).toHaveLength(3);
      expect(result.directories).toEqual([
        { path: 'src', displayName: 'src', sha: '' },
        { path: 'lib', displayName: 'lib', sha: '' },
        { path: 'docs', displayName: 'docs', sha: '' },
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
            { path: 'dir1/.kiro', type: 'tree', sha: 'sha2' },
            { path: 'dir1/.kiro/steering', type: 'tree', sha: 'sha3' },
            { path: 'file1.txt', type: 'blob', sha: 'sha4' }, // File (should be filtered out)
            { path: 'dir2', type: 'tree', sha: 'sha5' },
            { path: 'dir2/.kiro', type: 'tree', sha: 'sha6' },
            { path: 'dir2/.kiro/steering', type: 'tree', sha: 'sha7' },
            { path: 'file2.md', type: 'blob', sha: 'sha8' }, // File (should be filtered out)
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

      // Assert: Should return parent directories where .kiro/steering exists, files should be filtered out
      expect(result.success).toBe(true);
      expect(result.directories).toHaveLength(2);
      expect(result.directories).toEqual([
        { path: 'dir1', displayName: 'dir1', sha: '' },
        { path: 'dir2', displayName: 'dir2', sha: '' },
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
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Repository is very large, some directories may not be shown'
      );
    });

    it('should log debug warning for truncated response even when verbose is false', async () => {
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

      // Assert: Truncation warning is now always logged at debug level
      expect(result.success).toBe(true);
      expect(result.truncated).toBe(true);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Repository is very large, some directories may not be shown'
      );
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
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('Fetching tree SHA')
      );
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('Fetching repository tree')
      );
    });

    it('should log debug messages even when verbose is false', async () => {
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

      // Assert: Should log debug messages (verbose flag no longer controls whether debug is called)
      expect(mockLogger.debug).toHaveBeenCalled();
    });
  });

  describe('.kiro/steering parent directory extraction (Task 10.1)', () => {
    it('should extract parent directories where .kiro/steering exists', async () => {
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
            { path: 'lib', type: 'tree', sha: 'sha1' },
            { path: 'lib/a', type: 'tree', sha: 'sha2' },
            { path: 'lib/a/.kiro', type: 'tree', sha: 'sha3' },
            { path: 'lib/a/.kiro/steering', type: 'tree', sha: 'sha4' },
            { path: 'lib/sample', type: 'tree', sha: 'sha5' },
            { path: 'lib/sample/.kiro', type: 'tree', sha: 'sha6' },
            { path: 'lib/sample/.kiro/steering', type: 'tree', sha: 'sha7' },
            { path: 'src', type: 'tree', sha: 'sha8' },
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

      // Assert: Should return only parent directories where .kiro/steering exists
      expect(result.success).toBe(true);
      expect(result.directories).toHaveLength(2);
      expect(result.directories).toEqual([
        { path: 'lib/a', displayName: 'lib/a', sha: '' },
        { path: 'lib/sample', displayName: 'lib/sample', sha: '' },
      ]);
    });

    it('should return root directory when .kiro/steering exists at root', async () => {
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
            { path: '.kiro', type: 'tree', sha: 'sha1' },
            { path: '.kiro/steering', type: 'tree', sha: 'sha2' },
            { path: 'src', type: 'tree', sha: 'sha3' },
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

      // Assert: Should return empty string for root
      expect(result.success).toBe(true);
      expect(result.directories).toHaveLength(1);
      expect(result.directories).toEqual([
        { path: '', displayName: '(root)', sha: '' },
      ]);
    });

    it('should return empty array when no .kiro/steering exists', async () => {
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
            { path: 'src', type: 'tree', sha: 'sha1' },
            { path: 'lib', type: 'tree', sha: 'sha2' },
            { path: 'README.md', type: 'blob', sha: 'sha3' },
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

      // Assert: Should return empty array
      expect(result.success).toBe(true);
      expect(result.directories).toEqual([]);
    });

    it('should remove duplicate parent directories', async () => {
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
            { path: 'lib/a', type: 'tree', sha: 'sha1' },
            { path: 'lib/a/.kiro', type: 'tree', sha: 'sha2' },
            { path: 'lib/a/.kiro/steering', type: 'tree', sha: 'sha3' },
            { path: 'lib/a/.kiro/specs', type: 'tree', sha: 'sha4' },
            { path: 'lib/a/.kiro/specs/project1', type: 'tree', sha: 'sha5' },
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

      // Assert: Should return only one entry for lib/a (no duplicates)
      expect(result.success).toBe(true);
      expect(result.directories).toHaveLength(1);
      expect(result.directories).toEqual([
        { path: 'lib/a', displayName: 'lib/a', sha: '' },
      ]);
    });

    it('should handle nested directory structures correctly', async () => {
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
            { path: 'packages', type: 'tree', sha: 'sha1' },
            { path: 'packages/api', type: 'tree', sha: 'sha2' },
            { path: 'packages/api/.kiro', type: 'tree', sha: 'sha3' },
            { path: 'packages/api/.kiro/steering', type: 'tree', sha: 'sha4' },
            { path: 'packages/web', type: 'tree', sha: 'sha5' },
            { path: 'packages/web/.kiro', type: 'tree', sha: 'sha6' },
            { path: 'packages/web/.kiro/steering', type: 'tree', sha: 'sha7' },
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

      // Assert: Should return both packages/api and packages/web
      expect(result.success).toBe(true);
      expect(result.directories).toHaveLength(2);
      expect(result.directories).toEqual([
        { path: 'packages/api', displayName: 'packages/api', sha: '' },
        { path: 'packages/web', displayName: 'packages/web', sha: '' },
      ]);
    });
  });
});
