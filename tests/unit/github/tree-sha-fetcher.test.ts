/**
 * Unit tests for Tree SHA Fetcher
 *
 * Tests Tree SHA retrieval from GitHub repository (task 1.1)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Octokit } from 'octokit';
import { getTreeSha } from '../../../src/github/tree-sha-fetcher.js';

// Mock Octokit module
vi.mock('octokit');

describe('Tree SHA Fetcher', () => {
  let mockOctokit: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create mock Octokit instance
    mockOctokit = {
      rest: {
        repos: {
          get: vi.fn(),
          getBranch: vi.fn(),
        },
      },
    };

    // Mock Octokit constructor
    (Octokit as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => mockOctokit);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getTreeSha', () => {
    describe('when branch is NOT specified', () => {
      it('should retrieve default branch tree SHA', async () => {
        // Arrange: Mock repository info with default branch
        mockOctokit.rest.repos.get.mockResolvedValue({
          data: {
            default_branch: 'main',
          },
        });

        // Mock branch info with tree SHA
        mockOctokit.rest.repos.getBranch.mockResolvedValue({
          data: {
            commit: {
              sha: 'abc123def456',
            },
          },
        });

        // Act
        const result = await getTreeSha(mockOctokit, 'owner', 'repo');

        // Assert
        expect(result).toBe('abc123def456');
        expect(mockOctokit.rest.repos.get).toHaveBeenCalledWith({
          owner: 'owner',
          repo: 'repo',
        });
        expect(mockOctokit.rest.repos.getBranch).toHaveBeenCalledWith({
          owner: 'owner',
          repo: 'repo',
          branch: 'main',
        });
      });

      it('should handle repository with "master" as default branch', async () => {
        // Arrange
        mockOctokit.rest.repos.get.mockResolvedValue({
          data: {
            default_branch: 'master',
          },
        });

        mockOctokit.rest.repos.getBranch.mockResolvedValue({
          data: {
            commit: {
              sha: 'xyz789abc123',
            },
          },
        });

        // Act
        const result = await getTreeSha(mockOctokit, 'owner', 'repo');

        // Assert
        expect(result).toBe('xyz789abc123');
        expect(mockOctokit.rest.repos.getBranch).toHaveBeenCalledWith({
          owner: 'owner',
          repo: 'repo',
          branch: 'master',
        });
      });
    });

    describe('when branch IS specified', () => {
      it('should retrieve specified branch tree SHA directly', async () => {
        // Arrange
        mockOctokit.rest.repos.getBranch.mockResolvedValue({
          data: {
            commit: {
              sha: 'feature123sha',
            },
          },
        });

        // Act
        const result = await getTreeSha(mockOctokit, 'owner', 'repo', 'feature-branch');

        // Assert
        expect(result).toBe('feature123sha');
        expect(mockOctokit.rest.repos.get).not.toHaveBeenCalled(); // Should NOT call get() when branch is specified
        expect(mockOctokit.rest.repos.getBranch).toHaveBeenCalledWith({
          owner: 'owner',
          repo: 'repo',
          branch: 'feature-branch',
        });
      });

      it('should handle branch with special characters', async () => {
        // Arrange
        mockOctokit.rest.repos.getBranch.mockResolvedValue({
          data: {
            commit: {
              sha: 'special123sha',
            },
          },
        });

        // Act
        const result = await getTreeSha(mockOctokit, 'owner', 'repo', 'feat/awesome-feature');

        // Assert
        expect(result).toBe('special123sha');
        expect(mockOctokit.rest.repos.getBranch).toHaveBeenCalledWith({
          owner: 'owner',
          repo: 'repo',
          branch: 'feat/awesome-feature',
        });
      });
    });

    describe('error handling', () => {
      it('should throw error with 404 status when branch is not found', async () => {
        // Arrange
        const error: any = new Error('Not Found');
        error.status = 404;
        mockOctokit.rest.repos.getBranch.mockRejectedValue(error);

        // Act & Assert
        await expect(getTreeSha(mockOctokit, 'owner', 'repo', 'nonexistent-branch'))
          .rejects
          .toThrow('Branch not found: nonexistent-branch');
      });

      it('should throw error with 404 status when repository is not found (no branch specified)', async () => {
        // Arrange
        const error: any = new Error('Not Found');
        error.status = 404;
        mockOctokit.rest.repos.get.mockRejectedValue(error);

        // Act & Assert
        await expect(getTreeSha(mockOctokit, 'owner', 'nonexistent-repo'))
          .rejects
          .toThrow('Repository not found: owner/nonexistent-repo');
      });

      it('should throw error with 401 status for authentication errors', async () => {
        // Arrange
        const error: any = new Error('Unauthorized');
        error.status = 401;
        mockOctokit.rest.repos.getBranch.mockRejectedValue(error);

        // Act & Assert
        await expect(getTreeSha(mockOctokit, 'owner', 'private-repo', 'main'))
          .rejects
          .toThrow('Authentication error: Please set GITHUB_TOKEN environment variable');
      });

      it('should throw error with 403 status for permission errors', async () => {
        // Arrange
        const error: any = new Error('Forbidden');
        error.status = 403;
        mockOctokit.rest.repos.getBranch.mockRejectedValue(error);

        // Act & Assert
        await expect(getTreeSha(mockOctokit, 'owner', 'repo', 'protected-branch'))
          .rejects
          .toThrow('Permission denied: Cannot access branch protected-branch');
      });

      it('should throw generic error for other API failures', async () => {
        // Arrange
        const error: any = new Error('Service Unavailable');
        error.status = 503;
        mockOctokit.rest.repos.getBranch.mockRejectedValue(error);

        // Act & Assert
        await expect(getTreeSha(mockOctokit, 'owner', 'repo', 'main'))
          .rejects
          .toThrow('Failed to retrieve tree SHA: Service Unavailable');
      });

      it('should handle network errors without status code', async () => {
        // Arrange
        mockOctokit.rest.repos.get.mockRejectedValue(new Error('Network timeout'));

        // Act & Assert
        await expect(getTreeSha(mockOctokit, 'owner', 'repo'))
          .rejects
          .toThrow('Failed to retrieve tree SHA: Network timeout');
      });
    });
  });
});
