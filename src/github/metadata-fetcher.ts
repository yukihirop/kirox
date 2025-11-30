import type { Octokit } from 'octokit';

export enum GitHubMetadataErrorType {
  FILE_NOT_FOUND = 'FILE_NOT_FOUND',
  RATE_LIMIT = 'RATE_LIMIT',
  INVALID_TYPE = 'INVALID_TYPE',
  API_ERROR = 'API_ERROR',
}

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

export interface FileMetadata {
  path: string;
  sha: string;
  size: number;
}

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

    if (Array.isArray(response.data)) {
      throw new GitHubMetadataError(
        GitHubMetadataErrorType.INVALID_TYPE,
        `Path "${path}" is not a file`,
        path,
        'Expected a file but got a directory'
      );
    }

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
    if (error instanceof GitHubMetadataError) {
      throw error;
    }

    if (error instanceof Error && 'status' in error) {
      const apiError = error as Error & { status: number };

      if (apiError.status === 404) {
        throw new GitHubMetadataError(
          GitHubMetadataErrorType.FILE_NOT_FOUND,
          `File not found: ${path}`,
          path,
          apiError.message
        );
      }

      if (apiError.status === 403 || apiError.status === 429) {
        throw new GitHubMetadataError(
          GitHubMetadataErrorType.RATE_LIMIT,
          `Rate limit exceeded while fetching: ${path}`,
          path,
          apiError.message
        );
      }

      throw new GitHubMetadataError(
        GitHubMetadataErrorType.API_ERROR,
        `GitHub API error while fetching: ${path}`,
        path,
        apiError.message
      );
    }

    throw new GitHubMetadataError(
      GitHubMetadataErrorType.API_ERROR,
      `Failed to fetch metadata: ${path}`,
      path,
      error instanceof Error ? error.message : String(error)
    );
  }
}
