/**
 * GitHub Metadata Fetcher
 *
 * Fetches file metadata (SHA, size) from GitHub without downloading content
 */

import type { Octokit } from 'octokit';

/**
 * GitHub metadata error types
 */
export enum GitHubMetadataErrorType {
  FILE_NOT_FOUND = 'FILE_NOT_FOUND', // 404: File or repository not found
  RATE_LIMIT = 'RATE_LIMIT', // 403/429: Rate limit exceeded
  INVALID_TYPE = 'INVALID_TYPE', // Path is a directory, not a file
  API_ERROR = 'API_ERROR', // Other API errors
}

/**
 * GitHub metadata error
 */
export class GitHubMetadataError extends Error {
  constructor(
    public readonly type: GitHubMetadataErrorType,
    message: string,
    public readonly path: string,
    public readonly details?: string
  ) {
    super(message);
    this.name = 'GitHubMetadataError';
  }
}

/**
 * File metadata from GitHub
 */
export interface FileMetadata {
  /** File path in repository */
  path: string;
  /** Git SHA hash */
  sha: string;
  /** File size in bytes */
  size: number;
}

/**
 * Fetch file metadata from GitHub without downloading content
 *
 * @param client - Octokit client instance
 * @param owner - Repository owner
 * @param repo - Repository name
 * @param path - File path in repository
 * @returns File metadata (path, SHA, size)
 * @throws {GitHubMetadataError} If file not found, rate limit exceeded, or API error
 */
export async function fetchFileMetadata(
  client: Octokit,
  owner: string,
  repo: string,
  path: string
): Promise<FileMetadata> {
  try {
    const response = await client.rest.repos.getContent({
      owner,
      repo,
      path,
    });

    // Check if response is an array (directory) instead of a file
    if (Array.isArray(response.data)) {
      throw new GitHubMetadataError(
        GitHubMetadataErrorType.INVALID_TYPE,
        `Path "${path}" is not a file`,
        path,
        'Expected a file but got a directory'
      );
    }

    // Extract metadata only (ignore content)
    const data = response.data as {
      path: string;
      sha: string;
      size: number;
      type: string;
    };

    return {
      path: data.path,
      sha: data.sha,
      size: data.size,
    };
  } catch (error) {
    // Handle GitHubMetadataError thrown above
    if (error instanceof GitHubMetadataError) {
      throw error;
    }

    // Handle GitHub API errors
    if (error instanceof Error && 'status' in error) {
      const apiError = error as Error & { status: number };

      // 404: File or repository not found
      if (apiError.status === 404) {
        throw new GitHubMetadataError(
          GitHubMetadataErrorType.FILE_NOT_FOUND,
          `File not found: ${path}`,
          path,
          apiError.message
        );
      }

      // 403/429: Rate limit exceeded
      if (apiError.status === 403 || apiError.status === 429) {
        throw new GitHubMetadataError(
          GitHubMetadataErrorType.RATE_LIMIT,
          `Rate limit exceeded while fetching: ${path}`,
          path,
          apiError.message
        );
      }

      // Other API errors
      throw new GitHubMetadataError(
        GitHubMetadataErrorType.API_ERROR,
        `GitHub API error while fetching: ${path}`,
        path,
        apiError.message
      );
    }

    // Unexpected error
    throw new GitHubMetadataError(
      GitHubMetadataErrorType.API_ERROR,
      `Failed to fetch metadata: ${path}`,
      path,
      error instanceof Error ? error.message : String(error)
    );
  }
}
