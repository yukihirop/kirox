import { describe, it, expect, vi } from 'vitest';
import { fetchDirectoryContents, parseRepositoryPath } from '@/github/fetcher';
import type { Octokit } from 'octokit';

describe('GitHubFetcher', () => {
  describe('parseRepositoryPath', () => {
    it('should parse valid repository path (owner/repo)', () => {
      const result = parseRepositoryPath('octocat/Hello-World');

      expect(result).toEqual({
        owner: 'octocat',
        repo: 'Hello-World',
      });
    });

    it('should parse repository path with hyphens and underscores', () => {
      const result = parseRepositoryPath('my-org/my_awesome-repo');

      expect(result).toEqual({
        owner: 'my-org',
        repo: 'my_awesome-repo',
      });
    });

    it('should throw error for invalid repository path format', () => {
      expect(() => parseRepositoryPath('invalid')).toThrow(
        'Invalid repository format'
      );
    });

    it('should throw error for empty repository path', () => {
      expect(() => parseRepositoryPath('')).toThrow('Invalid repository format');
    });

    it('should throw error for repository path with too many slashes', () => {
      expect(() => parseRepositoryPath('owner/repo/extra')).toThrow(
        'Invalid repository format'
      );
    });
  });

  describe('fetchDirectoryContents', () => {
    it('should fetch directory contents from GitHub API using mock', async () => {
      const mockClient = {
        rest: {
          repos: {
            getContent: vi.fn().mockResolvedValue({
              data: [
                {
                  name: 'README.md',
                  path: 'README.md',
                  type: 'file',
                  sha: 'abc123',
                  size: 100,
                  download_url: 'https://example.com/README.md',
                },
                {
                  name: 'src',
                  path: 'src',
                  type: 'dir',
                  sha: 'def456',
                },
              ],
            }),
          },
        },
      } as unknown as Octokit;

      const contents = await fetchDirectoryContents(mockClient, 'octocat', 'Hello-World', '');

      expect(contents).toBeDefined();
      expect(Array.isArray(contents)).toBe(true);
      expect(contents.length).toBe(2);
      expect(mockClient.rest.repos.getContent).toHaveBeenCalledWith({
        owner: 'octocat',
        repo: 'Hello-World',
        path: '',
      });
    });

    it('should return array of file/directory objects with correct properties', async () => {
      const mockClient = {
        rest: {
          repos: {
            getContent: vi.fn().mockResolvedValue({
              data: [
                {
                  name: 'test.md',
                  path: 'docs/test.md',
                  type: 'file',
                  sha: 'xyz789',
                  size: 200,
                  download_url: 'https://example.com/test.md',
                },
              ],
            }),
          },
        },
      } as unknown as Octokit;

      const contents = await fetchDirectoryContents(mockClient, 'owner', 'repo', 'docs');

      expect(Array.isArray(contents)).toBe(true);
      expect(contents.length).toBe(1);
      expect(contents[0]).toHaveProperty('name', 'test.md');
      expect(contents[0]).toHaveProperty('path', 'docs/test.md');
      expect(contents[0]).toHaveProperty('type', 'file');
      expect(contents[0]).toHaveProperty('sha', 'xyz789');
      expect(contents[0]).toHaveProperty('size', 200);
    });

    it('should throw error for non-existent repository (404)', async () => {
      const mockError = Object.assign(new Error('Not Found'), { status: 404 });
      const mockClient = {
        rest: {
          repos: {
            getContent: vi.fn().mockRejectedValue(mockError),
          },
        },
      } as unknown as Octokit;

      await expect(
        fetchDirectoryContents(mockClient, 'nonexistent', 'repo', '')
      ).rejects.toThrow('not found');
    });

    it('should throw error for non-existent directory path', async () => {
      const mockError = Object.assign(new Error('Not Found'), { status: 404 });
      const mockClient = {
        rest: {
          repos: {
            getContent: vi.fn().mockRejectedValue(mockError),
          },
        },
      } as unknown as Octokit;

      await expect(
        fetchDirectoryContents(mockClient, 'owner', 'repo', 'nonexistent/path')
      ).rejects.toThrow('not found');
    });

    it('should handle root directory path (empty string)', async () => {
      const mockClient = {
        rest: {
          repos: {
            getContent: vi.fn().mockResolvedValue({
              data: [
                {
                  name: 'file.txt',
                  path: 'file.txt',
                  type: 'file',
                  sha: 'aaa111',
                },
              ],
            }),
          },
        },
      } as unknown as Octokit;

      const contents = await fetchDirectoryContents(mockClient, 'owner', 'repo', '');

      expect(contents).toBeDefined();
      expect(Array.isArray(contents)).toBe(true);
      expect(mockClient.rest.repos.getContent).toHaveBeenCalledWith({
        owner: 'owner',
        repo: 'repo',
        path: '',
      });
    });

    it('should differentiate between files and directories', async () => {
      const mockClient = {
        rest: {
          repos: {
            getContent: vi.fn().mockResolvedValue({
              data: [
                {
                  name: 'README.md',
                  path: 'README.md',
                  type: 'file',
                  sha: 'file123',
                  size: 50,
                },
                {
                  name: 'src',
                  path: 'src',
                  type: 'dir',
                  sha: 'dir456',
                },
              ],
            }),
          },
        },
      } as unknown as Octokit;

      const contents = await fetchDirectoryContents(mockClient, 'owner', 'repo', '');

      const fileItem = contents.find((item) => item.type === 'file');
      const dirItem = contents.find((item) => item.type === 'dir');

      expect(fileItem).toBeDefined();
      expect(fileItem?.name).toBe('README.md');
      expect(dirItem).toBeDefined();
      expect(dirItem?.name).toBe('src');
    });

    it('should include necessary metadata (name, path, type, sha)', async () => {
      const mockClient = {
        rest: {
          repos: {
            getContent: vi.fn().mockResolvedValue({
              data: [
                {
                  name: 'config.json',
                  path: 'config/config.json',
                  type: 'file',
                  sha: 'config123',
                  size: 150,
                  download_url: 'https://example.com/config.json',
                },
              ],
            }),
          },
        },
      } as unknown as Octokit;

      const contents = await fetchDirectoryContents(mockClient, 'owner', 'repo', 'config');

      expect(contents.length).toBeGreaterThan(0);
      const item = contents[0];
      expect(item).toHaveProperty('name', 'config.json');
      expect(item).toHaveProperty('path', 'config/config.json');
      expect(item).toHaveProperty('type', 'file');
      expect(item).toHaveProperty('sha', 'config123');
      expect(item).toHaveProperty('size', 150);
    });

    it('should throw error if response is not an array (file instead of directory)', async () => {
      const mockClient = {
        rest: {
          repos: {
            getContent: vi.fn().mockResolvedValue({
              data: {
                name: 'single-file.txt',
                path: 'single-file.txt',
                type: 'file',
                sha: 'single123',
              },
            }),
          },
        },
      } as unknown as Octokit;

      await expect(
        fetchDirectoryContents(mockClient, 'owner', 'repo', 'single-file.txt')
      ).rejects.toThrow('is not a directory');
    });
  });

  describe('Error Handling', () => {
    it('should provide meaningful error for 404 Not Found', async () => {
      const mockError = Object.assign(new Error('Not Found'), { status: 404 });
      const mockClient = {
        rest: {
          repos: {
            getContent: vi.fn().mockRejectedValue(mockError),
          },
        },
      } as unknown as Octokit;

      await expect(
        fetchDirectoryContents(mockClient, 'nonexistent', 'repo', '')
      ).rejects.toThrow('not found');
    });

    it('should handle network errors gracefully', async () => {
      const mockClient = {
        rest: {
          repos: {
            getContent: vi.fn().mockRejectedValue(new Error('Network error: ECONNRESET')),
          },
        },
      } as unknown as Octokit;

      await expect(
        fetchDirectoryContents(mockClient, 'owner', 'repo', '')
      ).rejects.toThrow('Failed to fetch directory contents');
    });

    it('should handle API errors with proper error messages', async () => {
      const mockError = Object.assign(new Error('API rate limit exceeded'), { status: 403 });
      const mockClient = {
        rest: {
          repos: {
            getContent: vi.fn().mockRejectedValue(mockError),
          },
        },
      } as unknown as Octokit;

      await expect(
        fetchDirectoryContents(mockClient, 'owner', 'repo', 'path')
      ).rejects.toThrow('Failed to fetch directory contents');
    });
  });
});
