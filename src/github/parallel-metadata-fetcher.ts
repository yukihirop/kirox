import type { Octokit } from 'octokit';
import { Semaphore } from './semaphore.js';
import {
  fetchFileMetadata,
  GitHubMetadataError,
  GitHubMetadataErrorType,
  type FileMetadata,
} from './metadata-fetcher.js';

export type ProgressCallback = (completed: number, total: number, path: string) => void;

interface FetchOptions {
  maxConcurrency?: number;
  onProgress?: ProgressCallback;
}

interface MetadataFetchError {
  path: string;
  errorType: GitHubMetadataErrorType;
  message: string;
}

interface MetadataFetchResult {
  successful: FileMetadata[];
  failed: MetadataFetchError[];
}

export async function fetchMultipleMetadata(
  client: Octokit,
  owner: string,
  repo: string,
  paths: string[],
  options: FetchOptions = {}
): Promise<MetadataFetchResult> {
  const { maxConcurrency = 5, onProgress } = options;

  if (paths.length === 0) {
    return { successful: [], failed: [] };
  }

  const semaphore = new Semaphore(maxConcurrency);

  let completed = 0;
  const total = paths.length;

  const fetchTasks = paths.map(async (path) => {
    await semaphore.acquire();

    try {
      const metadata = await fetchFileMetadata(client, owner, repo, path);

      completed++;
      if (onProgress) {
        onProgress(completed, total, path);
      }

      return { status: 'fulfilled' as const, value: metadata };
    } catch (error) {
      completed++;
      if (onProgress) {
        onProgress(completed, total, path);
      }

      if (error instanceof GitHubMetadataError) {
        return {
          status: 'rejected' as const,
          reason: {
            path,
            errorType: error.type,
            message: error.message,
          },
        };
      }

      return {
        status: 'rejected' as const,
        reason: {
          path,
          errorType: GitHubMetadataErrorType.API_ERROR,
          message: error instanceof Error ? error.message : String(error),
        },
      };
    } finally {
      semaphore.release();
    }
  });

  const results = await Promise.all(fetchTasks);

  const successful: FileMetadata[] = [];
  const failed: MetadataFetchError[] = [];

  for (const result of results) {
    if (result.status === 'fulfilled') {
      successful.push(result.value);
    } else {
      failed.push(result.reason);
    }
  }

  return { successful, failed };
}
