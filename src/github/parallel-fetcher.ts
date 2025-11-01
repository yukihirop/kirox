/**
 * Parallel File Fetcher with Semaphore Control
 *
 * Handles parallel file fetching from GitHub repositories with
 * concurrency control, file size validation, and base64 decoding
 */

import type { Octokit } from 'octokit';
import { Semaphore } from './semaphore.js';

/**
 * Maximum file size allowed (1MB)
 */
const MAX_FILE_SIZE = 1024 * 1024; // 1MB in bytes

/**
 * Maximum total file count allowed
 */
const MAX_FILE_COUNT = 100;

/** Fetched file content with metadata - @internal Internal type - not exported */
interface FetchedFile {
  path: string;
  content: string;
  size: number;
  sha: string;
}

/** Failed file fetch with error information - @internal Internal type - not exported */
interface FailedFile {
  path: string;
  error: string;
  retryable: boolean;
}

/** Result of parallel file fetching operation - @internal Internal type - not exported */
interface ParallelFetchResult {
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
  // Remove whitespace characters (newlines, spaces, tabs) that GitHub API may include
  const cleanedContent = base64Content.replace(/\s/g, '');

  // Validate base64 format (basic validation)
  const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
  if (!base64Regex.test(cleanedContent)) {
    throw new Error('Invalid base64 string format');
  }

  try {
    return Buffer.from(cleanedContent, 'base64').toString('utf-8');
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
 * @param ref - Branch/tag/commit SHA (optional, defaults to repository's default branch)
 * @returns Fetched file with decoded content
 * @throws Error if file size exceeds limit or fetch fails
 */
export async function fetchFileContents(
  client: Octokit,
  owner: string,
  repo: string,
  path: string,
  ref?: string
): Promise<FetchedFile> {
  try {
    // Build request parameters - only include ref if specified
    const params: {
      owner: string;
      repo: string;
      path: string;
      ref?: string;
    } = {
      owner,
      repo,
      path,
    };

    // Only add ref parameter if branch is specified
    if (ref !== undefined) {
      params.ref = ref;
    }

    // Development: Add artificial delay to demonstrate spinner animation
    // Set KIROX_DEMO_DELAY=3000 to enable 3 second delay
    const demoDelay = process.env.KIROX_DEMO_DELAY;
    if (demoDelay) {
      await new Promise(resolve => setTimeout(resolve, parseInt(demoDelay, 10)));
    }

    const response = await client.rest.repos.getContent(params);

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
 * @param ref - Branch/tag/commit SHA (optional, defaults to repository's default branch)
 * @returns Result with successful and failed file fetches
 * @throws Error if total file count exceeds limit
 */
/**
 * Progress callback function type for fetchFilesInParallel
 *
 * Called before fetching each file to report progress
 *
 * @param current - Current file number (1-indexed)
 * @param total - Total number of files
 * @param filePath - Path of the file being fetched
 */
export type ProgressCallback = (current: number, total: number, filePath: string) => void;

export async function fetchFilesInParallel(
  client: Octokit,
  owner: string,
  repo: string,
  filePaths: string[],
  maxConcurrency: number = 5,
  ref?: string,
  onProgress?: ProgressCallback
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
   *
   * Task 14.5: Added progress callback support
   */
  const fetchWithSemaphore = async (path: string, index: number) => {
    await semaphore.acquire();

    try {
      // Task 14.5: Call progress callback before fetching
      // This allows spinner to display during actual file fetch
      if (onProgress) {
        onProgress(index + 1, filePaths.length, path);
      }

      const file = await fetchFileContents(client, owner, repo, path, ref);
      success.push(file);
    } catch (error) {
      // Task 8.1: Network error detection and user-friendly message
      // Task 8.2: Rate limit error detection and reset time calculation
      let errorMessage = 'Unknown error';
      let retryable = true;

      if (error instanceof Error) {
        errorMessage = error.message;

        // Check for HTTP status code
        const errorWithStatus = error as Error & {
          status?: number;
          response?: {
            status?: number;
            headers?: Record<string, string>;
          };
        };
        const status = errorWithStatus.status || errorWithStatus.response?.status;

        // Task 8.2: Detect rate limit errors (status 429)
        if (status === 429) {
          // Extract rate limit reset time from headers
          const resetHeader = errorWithStatus.response?.headers?.['x-ratelimit-reset'];
          let waitMessage = 'Please wait and try again later.';

          if (resetHeader) {
            const resetTime = parseInt(resetHeader, 10);
            const currentTime = Math.floor(Date.now() / 1000);
            const waitSeconds = Math.max(0, resetTime - currentTime);
            const waitMinutes = Math.ceil(waitSeconds / 60);

            waitMessage = `Please wait ${waitMinutes} minutes and try again.`;
          }

          errorMessage = `GitHub API rate limit exceeded. ${waitMessage}`;
          retryable = true; // Rate limit errors are retryable
        } else {
          // Detect network errors by checking error code
          const networkError = error as NodeJS.ErrnoException;
          const networkErrorCodes = [
            'ENOTFOUND',   // DNS lookup failed
            'ETIMEDOUT',   // Connection timeout
            'ECONNREFUSED', // Connection refused
            'ECONNRESET',  // Connection reset
            'EHOSTUNREACH', // Host unreachable
            'ENETUNREACH',  // Network unreachable
          ];

          if (networkError.code && networkErrorCodes.includes(networkError.code)) {
            // Format network error with user-friendly guidance
            errorMessage = `Network error: ${errorMessage}. Check your internet connection.`;
          }
        }

        // File size errors are not retryable
        if (errorMessage.includes('size exceeds')) {
          retryable = false;
        }
      }

      failed.push({
        path,
        error: errorMessage,
        retryable,
      });
    } finally {
      semaphore.release();
    }
  };

  // Fetch all files in parallel with semaphore control
  // Task 14.5: Pass index to fetchWithSemaphore for progress reporting
  const fetchPromises = filePaths.map((path, index) => fetchWithSemaphore(path, index));

  // Wait for all fetches to complete (using Promise.allSettled for partial failure tolerance)
  await Promise.allSettled(fetchPromises);

  return {
    success,
    failed,
  };
}
