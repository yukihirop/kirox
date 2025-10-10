/**
 * Unit tests for Tree-Based Project Scanner
 *
 * Tests core scan functionality using GitHub Tree API (task 2.1)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Octokit } from 'octokit';
import type { Logger } from '../../../src/reporting/logger.js';
import type { RepositoryRef } from '../../../src/github/fetcher.js';

// Will be implemented in GREEN phase
interface TreeScanResult {
  projects: Array<{
    name: string;
    subdir: string;
    displayName: string;
    path: string;
    type: 'tree';
    mode: string;
    sha: string;
    url: string;
    projectName: string;
  }>;
  success: boolean;
  truncated: boolean;
  errorMessage?: string;
}

interface TreeScanOptions {
  repository: RepositoryRef;
  client: Octokit;
  logger: Logger;
  verbose: boolean;
}

// Function to be implemented
declare function scanProjectsAcrossSubdirs(options: TreeScanOptions): Promise<TreeScanResult>;

describe('Tree-Based Project Scanner', () => {
  let mockClient: Octokit;
  let mockLogger: Logger;
  let repository: RepositoryRef;

  beforeEach(() => {
    // Mock Octokit client
    mockClient = {
      rest: {
        repos: {
          get: vi.fn(),
          getBranch: vi.fn(),
        },
        git: {
          getTree: vi.fn(),
        },
      },
    } as unknown as Octokit;

    // Mock Logger
    mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      verbose: vi.fn(),
    } as unknown as Logger;

    repository = {
      owner: 'test-owner',
      repo: 'test-repo',
      branch: 'main',
    };
  });

  describe('scanProjectsAcrossSubdirs', () => {
    describe('successful Tree API calls', () => {
      it('should call Tree API with recursive=1 and return ProjectLocation list', async () => {
        // Arrange: Mock getBranch to return commit SHA
        // Note: getTreeSha returns commit.sha (commit SHA), not tree SHA
        vi.mocked(mockClient.rest.repos.getBranch).mockResolvedValue({
          data: {
            commit: {
              sha: 'commit-sha-123',
            },
          },
        } as any);

        // Mock getTree to return tree with .kiro/specs/ projects
        vi.mocked(mockClient.rest.git.getTree).mockResolvedValue({
          data: {
            sha: 'commit-sha-123',
            tree: [
              {
                path: '.kiro/specs/project-a',
                type: 'tree',
                mode: '040000',
                sha: 'abc123',
                url: 'https://api.github.com/repos/test-owner/test-repo/git/trees/abc123',
              },
              {
                path: 'lib/utils/.kiro/specs/project-b',
                type: 'tree',
                mode: '040000',
                sha: 'def456',
                url: 'https://api.github.com/repos/test-owner/test-repo/git/trees/def456',
              },
              {
                path: 'src/index.ts',
                type: 'blob',
                mode: '100644',
                sha: 'ghi789',
                url: 'https://api.github.com/repos/test-owner/test-repo/git/blobs/ghi789',
              },
            ],
            truncated: false,
          },
        } as any);

        // Act
        const { scanProjectsAcrossSubdirs } = await import('../../../src/github/tree-based-project-scanner.js');
        const result = await scanProjectsAcrossSubdirs({
          repository,
          client: mockClient,
          logger: mockLogger,
          verbose: false,
        });

        // Assert: Should call getTree with recursive=1
        expect(mockClient.rest.git.getTree).toHaveBeenCalledWith({
          owner: 'test-owner',
          repo: 'test-repo',
          tree_sha: 'commit-sha-123',
          recursive: '1',
        });

        // Assert: Should return ProjectLocation list
        expect(result.success).toBe(true);
        expect(result.truncated).toBe(false);
        expect(result.projects).toHaveLength(2);
        expect(result.projects[0]).toMatchObject({
          name: 'project-a',
          subdir: '',
          displayName: 'project-a',
          projectName: 'project-a',
        });
        expect(result.projects[1]).toMatchObject({
          name: 'project-b',
          subdir: 'lib/utils',
          displayName: 'lib/utils/project-b',
          projectName: 'project-b',
        });
      });

      it('should detect and propagate truncated flag from Tree API response', async () => {
        // Arrange: Mock getBranch
        vi.mocked(mockClient.rest.repos.getBranch).mockResolvedValue({
          data: {
            commit: {
              sha: 'commit-sha',
              commit: {
                tree: {
                  sha: 'tree-sha-456',
                },
              },
            },
          },
        } as any);

        // Mock getTree with truncated=true
        vi.mocked(mockClient.rest.git.getTree).mockResolvedValue({
          data: {
            sha: 'tree-sha-456',
            tree: [
              {
                path: '.kiro/specs/project-x',
                type: 'tree',
                mode: '040000',
                sha: 'xyz123',
                url: 'https://api.github.com/repos/test-owner/test-repo/git/trees/xyz123',
              },
            ],
            truncated: true,
          },
        } as any);

        // Act
        const { scanProjectsAcrossSubdirs } = await import('../../../src/github/tree-based-project-scanner.js');
        const result = await scanProjectsAcrossSubdirs({
          repository,
          client: mockClient,
          logger: mockLogger,
          verbose: false,
        });

        // Assert: truncated flag should be propagated
        expect(result.success).toBe(true);
        expect(result.truncated).toBe(true);
        expect(result.projects).toHaveLength(1);
      });

      it('should return empty project list when no .kiro/specs/ directories found', async () => {
        // Arrange: Mock getBranch
        vi.mocked(mockClient.rest.repos.getBranch).mockResolvedValue({
          data: {
            commit: {
              sha: 'commit-sha',
              commit: {
                tree: {
                  sha: 'tree-sha-789',
                },
              },
            },
          },
        } as any);

        // Mock getTree with no .kiro/specs/ directories
        vi.mocked(mockClient.rest.git.getTree).mockResolvedValue({
          data: {
            sha: 'tree-sha-789',
            tree: [
              {
                path: 'src/index.ts',
                type: 'blob',
                mode: '100644',
                sha: 'aaa111',
                url: 'https://api.github.com/repos/test-owner/test-repo/git/blobs/aaa111',
              },
              {
                path: 'README.md',
                type: 'blob',
                mode: '100644',
                sha: 'bbb222',
                url: 'https://api.github.com/repos/test-owner/test-repo/git/blobs/bbb222',
              },
            ],
            truncated: false,
          },
        } as any);

        // Act
        const { scanProjectsAcrossSubdirs } = await import('../../../src/github/tree-based-project-scanner.js');
        const result = await scanProjectsAcrossSubdirs({
          repository,
          client: mockClient,
          logger: mockLogger,
          verbose: false,
        });

        // Assert
        expect(result.success).toBe(true);
        expect(result.truncated).toBe(false);
        expect(result.projects).toEqual([]);
      });
    });

    describe('integration with component layers', () => {
      it('should integrate getTreeSha, parseTreeResponse, and buildProjectLocations', async () => {
        // Arrange: This test verifies the full component integration
        vi.mocked(mockClient.rest.repos.getBranch).mockResolvedValue({
          data: {
            commit: {
              sha: 'commit-sha',
              commit: {
                tree: {
                  sha: 'integration-tree-sha',
                },
              },
            },
          },
        } as any);

        vi.mocked(mockClient.rest.git.getTree).mockResolvedValue({
          data: {
            sha: 'integration-tree-sha',
            tree: [
              // Root project
              {
                path: '.kiro/specs/auth',
                type: 'tree',
                mode: '040000',
                sha: 'sha1',
                url: 'https://api.github.com/repos/test-owner/test-repo/git/trees/sha1',
              },
              // Subdirectory project
              {
                path: 'packages/core/.kiro/specs/api',
                type: 'tree',
                mode: '040000',
                sha: 'sha2',
                url: 'https://api.github.com/repos/test-owner/test-repo/git/trees/sha2',
              },
              // Non-project directory
              {
                path: '.kiro/steering',
                type: 'tree',
                mode: '040000',
                sha: 'sha3',
                url: 'https://api.github.com/repos/test-owner/test-repo/git/trees/sha3',
              },
            ],
            truncated: false,
          },
        } as any);

        // Act
        const { scanProjectsAcrossSubdirs } = await import('../../../src/github/tree-based-project-scanner.js');
        const result = await scanProjectsAcrossSubdirs({
          repository,
          client: mockClient,
          logger: mockLogger,
          verbose: false,
        });

        // Assert: Verify full integration chain
        expect(result.success).toBe(true);
        expect(result.projects).toHaveLength(2);

        // Verify root project processing
        expect(result.projects[0]).toMatchObject({
          name: 'auth',
          projectName: 'auth',
          subdir: '',
          displayName: 'auth',
          path: '.kiro/specs/auth',
        });

        // Verify subdirectory project processing
        expect(result.projects[1]).toMatchObject({
          name: 'api',
          projectName: 'api',
          subdir: 'packages/core',
          displayName: 'packages/core/api',
          path: 'packages/core/.kiro/specs/api',
        });
      });
    });

    describe('error handling', () => {
      it('should return error result when getTreeSha fails', async () => {
        // Arrange: Mock getBranch to throw error
        vi.mocked(mockClient.rest.repos.getBranch).mockRejectedValue(
          new Error('Branch not found')
        );

        // Act
        const { scanProjectsAcrossSubdirs } = await import('../../../src/github/tree-based-project-scanner.js');
        const result = await scanProjectsAcrossSubdirs({
          repository,
          client: mockClient,
          logger: mockLogger,
          verbose: false,
        });

        // Assert
        expect(result.success).toBe(false);
        expect(result.projects).toEqual([]);
        expect(result.truncated).toBe(false);
        expect(result.errorMessage).toContain('Branch not found');
      });

      it('should return error result when Tree API call fails', async () => {
        // Arrange: Mock getBranch succeeds
        vi.mocked(mockClient.rest.repos.getBranch).mockResolvedValue({
          data: {
            commit: {
              sha: 'commit-sha',
              commit: {
                tree: {
                  sha: 'tree-sha-999',
                },
              },
            },
          },
        } as any);

        // Mock getTree to throw error
        vi.mocked(mockClient.rest.git.getTree).mockRejectedValue(
          new Error('API rate limit exceeded')
        );

        // Act
        const { scanProjectsAcrossSubdirs } = await import('../../../src/github/tree-based-project-scanner.js');
        const result = await scanProjectsAcrossSubdirs({
          repository,
          client: mockClient,
          logger: mockLogger,
          verbose: false,
        });

        // Assert
        expect(result.success).toBe(false);
        expect(result.projects).toEqual([]);
        expect(result.truncated).toBe(false);
        expect(result.errorMessage).toContain('API rate limit exceeded');
      });
    });

    describe('verbose logging', () => {
      it('should log verbose messages when verbose=true', async () => {
        // Arrange
        vi.mocked(mockClient.rest.repos.getBranch).mockResolvedValue({
          data: {
            commit: {
              sha: 'commit-sha',
              commit: {
                tree: {
                  sha: 'tree-sha-verbose',
                },
              },
            },
          },
        } as any);

        vi.mocked(mockClient.rest.git.getTree).mockResolvedValue({
          data: {
            sha: 'tree-sha-verbose',
            tree: [
              {
                path: '.kiro/specs/verbose-project',
                type: 'tree',
                mode: '040000',
                sha: 'verbose-sha',
                url: 'https://api.github.com/repos/test-owner/test-repo/git/trees/verbose-sha',
              },
            ],
            truncated: false,
          },
        } as any);

        // Act
        const { scanProjectsAcrossSubdirs } = await import('../../../src/github/tree-based-project-scanner.js');
        await scanProjectsAcrossSubdirs({
          repository,
          client: mockClient,
          logger: mockLogger,
          verbose: true,
        });

        // Assert: Should have logged verbose messages
        expect(mockLogger.verbose).toHaveBeenCalled();
      });
    });
  });
});
