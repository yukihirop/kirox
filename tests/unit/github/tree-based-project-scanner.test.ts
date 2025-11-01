/**
 * Unit tests for Tree-Based Project Scanner
 *
 * Tests core scan functionality using GitHub Tree API (task 2.1)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Octokit } from 'octokit';
import type { PinoLogger } from '../../../src/reporting/pino-logger.js';
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
  entryCount: number; // Task 2.5: Total number of tree entries
  errorMessage?: string;
}

interface TreeScanOptions {
  repository: RepositoryRef;
  client: Octokit;
  logger: PinoLogger;
  verbose: boolean;
}

// Function to be implemented
declare function scanProjectsAcrossSubdirs(options: TreeScanOptions): Promise<TreeScanResult>;

describe('Tree-Based Project Scanner', () => {
  let mockClient: Octokit;
  let mockLogger: PinoLogger;
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
    } as unknown as PinoLogger;

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

        // Assert: Should have logged debug messages
        expect(mockLogger.debug).toHaveBeenCalled();
      });

      it('should log Tree SHA, entry count, and .kiro/specs/ directory count when verbose=true (task 2.4)', async () => {
        // Arrange
        vi.mocked(mockClient.rest.repos.getBranch).mockResolvedValue({
          data: {
            commit: {
              sha: 'commit-sha-detailed',
              commit: {
                tree: {
                  sha: 'tree-sha-abc123',
                },
              },
            },
          },
        } as any);

        vi.mocked(mockClient.rest.git.getTree).mockResolvedValue({
          data: {
            sha: 'tree-sha-abc123',
            tree: [
              {
                path: '.kiro/specs/project-a',
                type: 'tree',
                mode: '040000',
                sha: 'sha-a',
                url: 'https://api.github.com/repos/test-owner/test-repo/git/trees/sha-a',
              },
              {
                path: 'lib/utils/.kiro/specs/project-b',
                type: 'tree',
                mode: '040000',
                sha: 'sha-b',
                url: 'https://api.github.com/repos/test-owner/test-repo/git/trees/sha-b',
              },
              {
                path: 'src/index.ts',
                type: 'blob',
                mode: '100644',
                sha: 'sha-file',
                url: 'https://api.github.com/repos/test-owner/test-repo/git/blobs/sha-file',
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

        // Assert: Should log Tree SHA, total entry count, and .kiro/specs/ directory count
        // Requirement 7.4: Log Tree SHA, entry count, and processing details

        // 1. Should log Tree SHA during fetch (using commit SHA from getTreeSha)
        expect(mockLogger.debug).toHaveBeenCalledWith(
          expect.stringContaining('Fetching repository tree (recursive) with SHA: commit-sha-detailed')
        );

        // 2. Should log total entry count from tree response
        expect(mockLogger.debug).toHaveBeenCalledWith(
          expect.stringContaining('Parsing tree response (3 entries)')
        );

        // 3. Should log count of found .kiro/specs/ directories
        expect(mockLogger.debug).toHaveBeenCalledWith(
          expect.stringContaining('Found 2 .kiro/specs/ directories')
        );
      });

      it('should log debug messages even when verbose=false', async () => {
        // Arrange
        vi.mocked(mockClient.rest.repos.getBranch).mockResolvedValue({
          data: {
            commit: {
              sha: 'commit-sha',
              commit: {
                tree: {
                  sha: 'tree-sha-silent',
                },
              },
            },
          },
        } as any);

        vi.mocked(mockClient.rest.git.getTree).mockResolvedValue({
          data: {
            sha: 'tree-sha-silent',
            tree: [
              {
                path: '.kiro/specs/silent-project',
                type: 'tree',
                mode: '040000',
                sha: 'sha-silent',
                url: 'https://api.github.com/repos/test-owner/test-repo/git/trees/sha-silent',
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
          verbose: false,
        });

        // Assert: Should log debug messages (verbose flag no longer controls whether debug is called)
        expect(mockLogger.debug).toHaveBeenCalled();
      });

      it('should log truncation warning when truncated=true and verbose=true (task 2.4)', async () => {
        // Arrange
        vi.mocked(mockClient.rest.repos.getBranch).mockResolvedValue({
          data: {
            commit: {
              sha: 'commit-sha',
              commit: {
                tree: {
                  sha: 'tree-sha-truncated',
                },
              },
            },
          },
        } as any);

        vi.mocked(mockClient.rest.git.getTree).mockResolvedValue({
          data: {
            sha: 'tree-sha-truncated',
            tree: [
              {
                path: '.kiro/specs/project-x',
                type: 'tree',
                mode: '040000',
                sha: 'sha-x',
                url: 'https://api.github.com/repos/test-owner/test-repo/git/trees/sha-x',
              },
            ],
            truncated: true,
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

        // Assert: Should log truncation warning
        expect(mockLogger.debug).toHaveBeenCalledWith(
          'Warning: Tree response was truncated (>100,000 entries)'
        );
      });
    });

    describe('enhanced error handling (task 2.3)', () => {
      it('should handle 404 error with specific error message', async () => {
        // Arrange: Mock Tree API to return 404 error
        vi.mocked(mockClient.rest.repos.getBranch).mockResolvedValue({
          data: {
            commit: {
              sha: 'commit-sha',
            },
          },
        } as any);

        const error404 = new Error('Not Found') as Error & { status?: number };
        error404.status = 404;
        vi.mocked(mockClient.rest.git.getTree).mockRejectedValue(error404);

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
        expect(result.errorMessage).toBe('Repository or branch not found');
      });

      it('should handle 409 error (empty repository) with specific error message', async () => {
        // Arrange: Mock Tree API to return 409 error
        vi.mocked(mockClient.rest.repos.getBranch).mockResolvedValue({
          data: {
            commit: {
              sha: 'commit-sha',
            },
          },
        } as any);

        const error409 = new Error('Git Repository is empty') as Error & { status?: number };
        error409.status = 409;
        vi.mocked(mockClient.rest.git.getTree).mockRejectedValue(error409);

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
        expect(result.errorMessage).toBe('Repository is empty');
      });

      it('should handle 401 error (unauthorized) with specific error message', async () => {
        // Arrange: Mock Tree API to return 401 error
        vi.mocked(mockClient.rest.repos.getBranch).mockResolvedValue({
          data: {
            commit: {
              sha: 'commit-sha',
            },
          },
        } as any);

        const error401 = new Error('Bad credentials') as Error & { status?: number };
        error401.status = 401;
        vi.mocked(mockClient.rest.git.getTree).mockRejectedValue(error401);

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
        expect(result.errorMessage).toBe('Authentication error: Please set GITHUB_TOKEN environment variable');
      });

      it('should handle 403 error (forbidden) with specific error message', async () => {
        // Arrange: Mock Tree API to return 403 error
        vi.mocked(mockClient.rest.repos.getBranch).mockResolvedValue({
          data: {
            commit: {
              sha: 'commit-sha',
            },
          },
        } as any);

        const error403 = new Error('Forbidden') as Error & { status?: number };
        error403.status = 403;
        vi.mocked(mockClient.rest.git.getTree).mockRejectedValue(error403);

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
        expect(result.errorMessage).toBe('Authentication error: Please set GITHUB_TOKEN environment variable');
      });

      it('should handle other errors with generic error message', async () => {
        // Arrange: Mock Tree API to return generic error
        vi.mocked(mockClient.rest.repos.getBranch).mockResolvedValue({
          data: {
            commit: {
              sha: 'commit-sha',
            },
          },
        } as any);

        vi.mocked(mockClient.rest.git.getTree).mockRejectedValue(
          new Error('Network error')
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
        expect(result.errorMessage).toContain('Failed to call Tree API');
      });
    });

    describe('entry count tracking (task 2.5)', () => {
      it('should return entry count from tree response (requirement 8.4)', async () => {
        // Arrange: Mock tree response with specific entry count
        vi.mocked(mockClient.rest.repos.getBranch).mockResolvedValue({
          data: {
            commit: {
              sha: 'commit-sha',
            },
          },
        } as any);

        vi.mocked(mockClient.rest.git.getTree).mockResolvedValue({
          data: {
            sha: 'commit-sha',
            tree: [
              {
                path: '.kiro/specs/project-a',
                type: 'tree',
                mode: '040000',
                sha: 'sha-a',
                url: 'https://api.github.com/repos/test-owner/test-repo/git/trees/sha-a',
              },
              {
                path: 'src/index.ts',
                type: 'blob',
                mode: '100644',
                sha: 'sha-file1',
                url: 'https://api.github.com/repos/test-owner/test-repo/git/blobs/sha-file1',
              },
              {
                path: 'src/utils.ts',
                type: 'blob',
                mode: '100644',
                sha: 'sha-file2',
                url: 'https://api.github.com/repos/test-owner/test-repo/git/blobs/sha-file2',
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

        // Assert: Should return entry count (Requirement 8.4)
        expect(result.success).toBe(true);
        expect(result.entryCount).toBe(3); // Total tree entries
        expect(result.projects).toHaveLength(1); // Only .kiro/specs/ projects
      });

      it('should handle large repository with >10,000 entries', async () => {
        // Arrange: Simulate large repository with 15,000 entries
        vi.mocked(mockClient.rest.repos.getBranch).mockResolvedValue({
          data: {
            commit: {
              sha: 'commit-sha-large',
            },
          },
        } as any);

        // Generate large tree array (15,000 entries)
        const largeTree = [];
        for (let i = 0; i < 15000; i++) {
          largeTree.push({
            path: `src/file-${i}.ts`,
            type: 'blob' as const,
            mode: '100644',
            sha: `sha-${i}`,
            url: `https://api.github.com/repos/test-owner/test-repo/git/blobs/sha-${i}`,
          });
        }
        // Add some .kiro/specs/ projects
        largeTree.push({
          path: '.kiro/specs/project-x',
          type: 'tree' as const,
          mode: '040000',
          sha: 'sha-project-x',
          url: 'https://api.github.com/repos/test-owner/test-repo/git/trees/sha-project-x',
        });

        vi.mocked(mockClient.rest.git.getTree).mockResolvedValue({
          data: {
            sha: 'commit-sha-large',
            tree: largeTree,
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

        // Assert: Should return large entry count (Requirement 8.4)
        expect(result.success).toBe(true);
        expect(result.entryCount).toBe(15001); // 15,000 files + 1 project
        expect(result.projects).toHaveLength(1);
      });

      it('should return 0 entry count on error', async () => {
        // Arrange: Mock error
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

        // Assert: Error should return entryCount: 0
        expect(result.success).toBe(false);
        expect(result.entryCount).toBe(0);
        expect(result.projects).toEqual([]);
      });
    });

    describe('alphabetical sorting (task 2.2)', () => {
      it('should sort projects alphabetically by subdirectory path and project name', async () => {
        // Arrange: Create unsorted project list
        vi.mocked(mockClient.rest.repos.getBranch).mockResolvedValue({
          data: {
            commit: {
              sha: 'commit-sha',
            },
          },
        } as any);

        vi.mocked(mockClient.rest.git.getTree).mockResolvedValue({
          data: {
            sha: 'commit-sha',
            tree: [
              // Intentionally unsorted order
              {
                path: 'packages/z/.kiro/specs/zebra',
                type: 'tree',
                mode: '040000',
                sha: 'sha-zebra',
                url: 'https://api.github.com/repos/test-owner/test-repo/git/trees/sha-zebra',
              },
              {
                path: '.kiro/specs/root-project',
                type: 'tree',
                mode: '040000',
                sha: 'sha-root',
                url: 'https://api.github.com/repos/test-owner/test-repo/git/trees/sha-root',
              },
              {
                path: 'lib/b/.kiro/specs/beta',
                type: 'tree',
                mode: '040000',
                sha: 'sha-beta',
                url: 'https://api.github.com/repos/test-owner/test-repo/git/trees/sha-beta',
              },
              {
                path: 'lib/a/.kiro/specs/gamma',
                type: 'tree',
                mode: '040000',
                sha: 'sha-gamma',
                url: 'https://api.github.com/repos/test-owner/test-repo/git/trees/sha-gamma',
              },
              {
                path: 'lib/a/.kiro/specs/alpha',
                type: 'tree',
                mode: '040000',
                sha: 'sha-alpha',
                url: 'https://api.github.com/repos/test-owner/test-repo/git/trees/sha-alpha',
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

        // Assert: Projects should be sorted alphabetically
        // Order should be:
        // 1. root-project (root directory comes first)
        // 2. lib/a/alpha (subdir "lib/a", project "alpha")
        // 3. lib/a/gamma (subdir "lib/a", project "gamma")
        // 4. lib/b/beta (subdir "lib/b")
        // 5. packages/z/zebra (subdir "packages/z")
        expect(result.success).toBe(true);
        expect(result.projects).toHaveLength(5);

        expect(result.projects[0]?.displayName).toBe('root-project');
        expect(result.projects[1]?.displayName).toBe('lib/a/alpha');
        expect(result.projects[2]?.displayName).toBe('lib/a/gamma');
        expect(result.projects[3]?.displayName).toBe('lib/b/beta');
        expect(result.projects[4]?.displayName).toBe('packages/z/zebra');
      });

      it('should sort projects within the same subdirectory alphabetically', async () => {
        // Arrange: Multiple projects in the same subdirectory
        vi.mocked(mockClient.rest.repos.getBranch).mockResolvedValue({
          data: {
            commit: {
              sha: 'commit-sha',
            },
          },
        } as any);

        vi.mocked(mockClient.rest.git.getTree).mockResolvedValue({
          data: {
            sha: 'commit-sha',
            tree: [
              {
                path: 'packages/core/.kiro/specs/zulu',
                type: 'tree',
                mode: '040000',
                sha: 'sha-zulu',
                url: 'https://api.github.com/repos/test-owner/test-repo/git/trees/sha-zulu',
              },
              {
                path: 'packages/core/.kiro/specs/alpha',
                type: 'tree',
                mode: '040000',
                sha: 'sha-alpha',
                url: 'https://api.github.com/repos/test-owner/test-repo/git/trees/sha-alpha',
              },
              {
                path: 'packages/core/.kiro/specs/mike',
                type: 'tree',
                mode: '040000',
                sha: 'sha-mike',
                url: 'https://api.github.com/repos/test-owner/test-repo/git/trees/sha-mike',
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

        // Assert: Projects within same subdir should be alphabetically sorted
        expect(result.success).toBe(true);
        expect(result.projects).toHaveLength(3);

        expect(result.projects[0]?.name).toBe('alpha');
        expect(result.projects[1]?.name).toBe('mike');
        expect(result.projects[2]?.name).toBe('zulu');
      });
    });
  });
});
