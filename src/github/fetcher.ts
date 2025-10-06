/**
 * GitHub Repository Content Fetcher
 *
 * Handles fetching directory and file contents from GitHub repositories
 */

import type { Octokit } from 'octokit';

/**
 * Repository reference (owner/repo)
 */
export interface RepositoryRef {
  owner: string;
  repo: string;
}

/**
 * Directory or file item from GitHub API
 */
export interface ContentItem {
  name: string;
  path: string;
  type: 'file' | 'dir';
  sha: string;
  size?: number;
  download_url?: string | null;
}

/**
 * Parse repository path string into owner and repo
 *
 * @param repositoryPath - Repository path in "owner/repo" format
 * @returns Object with owner and repo properties
 * @throws Error if repository path format is invalid
 */
export function parseRepositoryPath(repositoryPath: string): RepositoryRef {
  if (!repositoryPath || typeof repositoryPath !== 'string') {
    throw new Error('Invalid repository format: must be "owner/repo"');
  }

  const parts = repositoryPath.split('/');

  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    throw new Error('Invalid repository format: must be "owner/repo"');
  }

  return {
    owner: parts[0],
    repo: parts[1],
  };
}

/**
 * Fetch directory contents from GitHub repository
 *
 * @param client - Octokit client instance
 * @param owner - Repository owner
 * @param repo - Repository name
 * @param path - Directory path (empty string for root)
 * @returns Array of content items (files and directories)
 * @throws Error if repository or path not found, or API request fails
 */
export async function fetchDirectoryContents(
  client: Octokit,
  owner: string,
  repo: string,
  path: string
): Promise<ContentItem[]> {
  try {
    const response = await client.rest.repos.getContent({
      owner,
      repo,
      path,
    });

    // GitHub API returns array for directories, object for files
    if (!Array.isArray(response.data)) {
      throw new Error(`Path "${path}" is not a directory`);
    }

    return response.data.map((item) => ({
      name: item.name,
      path: item.path,
      type: item.type as 'file' | 'dir',
      sha: item.sha,
      size: 'size' in item ? item.size : undefined,
      download_url: 'download_url' in item ? item.download_url : undefined,
    }));
  } catch (error) {
    if (error instanceof Error) {
      // Check for HTTP error with status code
      if ('status' in error) {
        const status = (error as { status: number }).status;
        if (status === 404) {
          throw new Error(
            `Repository "${owner}/${repo}" or path "${path}" not found`
          );
        }
      }
      throw new Error(
        `Failed to fetch directory contents: ${error.message}`
      );
    }
    throw error;
  }
}
