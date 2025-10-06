import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchDirectoryContents, parseRepositoryPath } from '@/github/fetcher';
import { createGitHubClient } from '@/github/client';

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
    it('should fetch directory contents from GitHub API', async () => {
      const client = createGitHubClient();
      const owner = 'octocat';
      const repo = 'Hello-World';
      const path = ''; // Use root directory for testing

      const contents = await fetchDirectoryContents(client, owner, repo, path);

      expect(contents).toBeDefined();
      expect(Array.isArray(contents)).toBe(true);
      expect(contents.length).toBeGreaterThan(0);
    });

    it('should return array of file/directory objects', async () => {
      const client = createGitHubClient();
      const owner = 'octocat';
      const repo = 'Hello-World';
      const path = '';

      const contents = await fetchDirectoryContents(client, owner, repo, path);

      expect(Array.isArray(contents)).toBe(true);
      if (contents.length > 0) {
        expect(contents[0]).toHaveProperty('name');
        expect(contents[0]).toHaveProperty('path');
        expect(contents[0]).toHaveProperty('type');
      }
    });

    it('should throw error for non-existent repository', async () => {
      const client = createGitHubClient();
      const owner = 'nonexistent-user-12345';
      const repo = 'nonexistent-repo-67890';
      const path = '';

      await expect(
        fetchDirectoryContents(client, owner, repo, path)
      ).rejects.toThrow();
    });

    it('should throw error for non-existent directory path', async () => {
      const client = createGitHubClient();
      const owner = 'octocat';
      const repo = 'Hello-World';
      const path = 'nonexistent/directory/path';

      await expect(
        fetchDirectoryContents(client, owner, repo, path)
      ).rejects.toThrow();
    });

    it('should handle root directory path (empty string)', async () => {
      const client = createGitHubClient();
      const owner = 'octocat';
      const repo = 'Hello-World';
      const path = '';

      const contents = await fetchDirectoryContents(client, owner, repo, path);

      expect(contents).toBeDefined();
      expect(Array.isArray(contents)).toBe(true);
    });

    it('should differentiate between files and directories', async () => {
      const client = createGitHubClient();
      const owner = 'octocat';
      const repo = 'Hello-World';
      const path = '';

      const contents = await fetchDirectoryContents(client, owner, repo, path);

      // Find at least one file or directory to verify type field
      const item = contents.find((item) => item.type === 'file' || item.type === 'dir');
      expect(item).toBeDefined();
      expect(['file', 'dir']).toContain(item?.type);
    });

    it('should include necessary metadata (name, path, type, sha)', async () => {
      const client = createGitHubClient();
      const owner = 'octocat';
      const repo = 'Hello-World';
      const path = '';

      const contents = await fetchDirectoryContents(client, owner, repo, path);

      if (contents.length > 0) {
        const item = contents[0];
        expect(item).toHaveProperty('name');
        expect(item).toHaveProperty('path');
        expect(item).toHaveProperty('type');
        expect(item).toHaveProperty('sha');
      }
    });
  });

  describe('Error Handling', () => {
    it('should provide meaningful error for 404 Not Found', async () => {
      const client = createGitHubClient();
      const owner = 'nonexistent';
      const repo = 'nonexistent';
      const path = '';

      await expect(
        fetchDirectoryContents(client, owner, repo, path)
      ).rejects.toThrow();
    });

    it('should handle network errors gracefully', async () => {
      const client = createGitHubClient();
      // Use invalid repository format to simulate error
      const owner = '';
      const repo = '';
      const path = '';

      await expect(
        fetchDirectoryContents(client, owner, repo, path)
      ).rejects.toThrow();
    });
  });
});
