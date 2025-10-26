/**
 * Parallel Metadata Fetcher
 *
 * Fetches metadata for multiple files in parallel with concurrency control
 */

import type { Octokit } from 'octokit';
import { Semaphore } from './semaphore.js';
import {
  fetchFileMetadata,
  GitHubMetadataError,
  GitHubMetadataErrorType,
  type FileMetadata,
} from './metadata-fetcher.js';

/**
 * Progress callback function
 */
export type ProgressCallback = (completed: number, total: number, path: string) => void;

/** Options for parallel metadata fetching - @internal Internal type - not exported */
interface FetchOptions {
  maxConcurrency?: number;
  onProgress?: ProgressCallback;
}

/** Failed metadata fetch information - @internal Internal type - not exported */
interface MetadataFetchError {
  path: string;
  errorType: GitHubMetadataErrorType;
  message: string;
}

/**
 * Result of fetching multiple file metadata
 */
export interface MetadataFetchResult {
  /** Successfully fetched metadata */
  successful: FileMetadata[];
  /** Failed fetches with error information */
  failed: MetadataFetchError[];
}

/**
 * Fetch metadata for multiple files in parallel
 *
 * @param client - Octokit client instance
 * @param owner - Repository owner
 * @param repo - Repository name
 * @param paths - Array of file paths to fetch
 * @param options - Fetch options (maxConcurrency, onProgress)
 * @returns Result with successful and failed fetches
 */
export async function fetchMultipleMetadata(
  client: Octokit,
  owner: string,
  repo: string,
  paths: string[],
  options: FetchOptions = {}
): Promise<MetadataFetchResult> {
  const { maxConcurrency = 5, onProgress } = options;

  // Handle empty paths
  if (paths.length === 0) {
    return { successful: [], failed: [] };
  }

  // Create semaphore for concurrency control
  const semaphore = new Semaphore(maxConcurrency);

  // Track progress
  let completed = 0;
  const total = paths.length;

  // Create fetch tasks with semaphore control
  const fetchTasks = paths.map(async (path) => {
    // Acquire semaphore slot
    await semaphore.acquire();

    try {
      // Fetch metadata
      const metadata = await fetchFileMetadata(client, owner, repo, path);

      // Update progress
      completed++;
      if (onProgress) {
        onProgress(completed, total, path);
      }

      return { status: 'fulfilled' as const, value: metadata };
    } catch (error) {
      // Handle fetch error
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

      // Unexpected error
      return {
        status: 'rejected' as const,
        reason: {
          path,
          errorType: GitHubMetadataErrorType.API_ERROR,
          message: error instanceof Error ? error.message : String(error),
        },
      };
    } finally {
      // Release semaphore slot
      semaphore.release();
    }
  });

  // Wait for all tasks to complete (allow partial failures)
  const results = await Promise.all(fetchTasks);

  // Separate successful and failed results
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
