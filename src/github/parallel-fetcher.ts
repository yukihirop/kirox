/**
 * Parallel File Fetcher with Semaphore Control
 *
 * Handles parallel file fetching from GitHub repositories with
 * concurrency control, file size validation, and base64 decoding
 */

import type { Octokit } from 'octokit';
import { Semaphore } from './semaphore';

/**
 * Maximum file size allowed (1MB)
 */
const MAX_FILE_SIZE = 1024 * 1024; // 1MB in bytes

/**
 * Maximum total file count allowed
 */
const MAX_FILE_COUNT = 100;

/**
 * Fetched file content with metadata
 */
export interface FetchedFile {
  path: string;
  content: string; // Decoded UTF-8 content
  size: number;
  sha: string;
}

/**
 * Failed file fetch with error information
 */
export interface FailedFile {
  path: string;
  error: string;
  retryable: boolean;
}

/**
 * Result of parallel file fetching operation
 */
export interface ParallelFetchResult {
  success: FetchedFile[];
  failed: FailedFile[];
}

/**
 * Decode base64 encoded content to UTF-8 string
 *
 * @param base64Content - Base64 encoded string
 * @returns Decoded UTF-8 string
 * @throws Error if base64 decoding fails
 */
export function decodeBase64Content(base64Content: string): string {
  // Validate base64 format (basic validation)
  const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
  if (!base64Regex.test(base64Content)) {
    throw new Error('Invalid base64 string format');
  }

  try {
    return Buffer.from(base64Content, 'base64').toString('utf-8');
  } catch (error) {
    throw new Error(
      `Failed to decode base64 content: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Validate file size against 1MB limit
 *
 * @param size - File size in bytes
 * @returns true if size is within limit, false otherwise
 */
export function validateFileSize(size: number): boolean {
  return size <= MAX_FILE_SIZE;
}

/**
 * Validate total file count against 100 files limit
 *
 * @param count - Total file count
 * @returns true if count is within limit, false otherwise
 */
export function validateTotalFileCount(count: number): boolean {
  return count <= MAX_FILE_COUNT;
}

/**
 * Fetch single file content from GitHub repository
 *
 * @param client - Octokit client instance
 * @param owner - Repository owner
 * @param repo - Repository name
 * @param path - File path
 * @returns Fetched file with decoded content
 * @throws Error if file size exceeds limit or fetch fails
 */
export async function fetchFileContents(
  client: Octokit,
  owner: string,
  repo: string,
  path: string
): Promise<FetchedFile> {
  try {
    const response = await client.rest.repos.getContent({
      owner,
      repo,
      path,
    });

    // Ensure response is a file (not directory)
    if (Array.isArray(response.data)) {
      throw new Error(`Path "${path}" is a directory, not a file`);
    }

    const data = response.data;

    // Type guard: ensure data has file properties
    if (data.type !== 'file') {
      throw new Error(`Path "${path}" is not a file`);
    }

    // Validate file size
    if (!validateFileSize(data.size)) {
      throw new Error(
        `File size exceeds 1MB limit: ${path} (${data.size} bytes)`
      );
    }

    // Ensure content is base64 encoded
    if (!('content' in data) || !data.content) {
      throw new Error(`File content not available: ${path}`);
    }

    if (data.encoding !== 'base64') {
      throw new Error(
        `Unexpected encoding "${data.encoding}" for file: ${path}`
      );
    }

    // Decode base64 content
    const decodedContent = decodeBase64Content(data.content);

    return {
      path: data.path,
      content: decodedContent,
      size: data.size,
      sha: data.sha,
    };
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(`Failed to fetch file "${path}": Unknown error`);
  }
}

/**
 * Fetch multiple files in parallel with concurrency control
 *
 * @param client - Octokit client instance
 * @param owner - Repository owner
 * @param repo - Repository name
 * @param filePaths - Array of file paths to fetch
 * @param maxConcurrency - Maximum concurrent requests (default: 5)
 * @returns Result with successful and failed file fetches
 * @throws Error if total file count exceeds limit
 */
export async function fetchFilesInParallel(
  client: Octokit,
  owner: string,
  repo: string,
  filePaths: string[],
  maxConcurrency: number = 5
): Promise<ParallelFetchResult> {
  // Validate total file count
  if (!validateTotalFileCount(filePaths.length)) {
    throw new Error(
      `Total file count exceeds 100 files limit: ${filePaths.length} files`
    );
  }

  const semaphore = new Semaphore(maxConcurrency);
  const success: FetchedFile[] = [];
  const failed: FailedFile[] = [];

  /**
   * Fetch single file with semaphore control
   */
  const fetchWithSemaphore = async (path: string) => {
    await semaphore.acquire();

    try {
      const file = await fetchFileContents(client, owner, repo, path);
      success.push(file);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      failed.push({
        path,
        error: errorMessage,
        retryable: !errorMessage.includes('size exceeds'),
      });
    } finally {
      semaphore.release();
    }
  };

  // Fetch all files in parallel with semaphore control
  const fetchPromises = filePaths.map((path) => fetchWithSemaphore(path));

  // Wait for all fetches to complete (using Promise.allSettled for partial failure tolerance)
  await Promise.allSettled(fetchPromises);

  return {
    success,
    failed,
  };
}
