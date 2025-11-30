import type { Octokit } from 'octokit';
import { Semaphore } from './semaphore.js';

const MAX_FILE_SIZE = 1024 * 1024;

const MAX_FILE_COUNT = 100;

interface FetchedFile {
  path: string;
  content: string;
  size: number;
  sha: string;
}

interface FailedFile {
  path: string;
  error: string;
  retryable: boolean;
}

interface ParallelFetchResult {
  success: FetchedFile[];
  failed: FailedFile[];
}

export function decodeBase64Content(base64Content: string): string {
  const cleanedContent = base64Content.replace(/\s/g, '');

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

export function validateFileSize(size: number): boolean {
  return size <= MAX_FILE_SIZE;
}

export function validateTotalFileCount(count: number): boolean {
  return count <= MAX_FILE_COUNT;
}

export async function fetchFileContents(
  client: Octokit,
  owner: string,
  repo: string,
  path: string,
  ref?: string
): Promise<FetchedFile> {
  try {
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

    if (ref !== undefined) {
      params.ref = ref;
    }

    const demoDelay = process.env.KIROX_DEMO_DELAY;
    if (demoDelay) {
      await new Promise(resolve => setTimeout(resolve, parseInt(demoDelay, 10)));
    }

    const response = await client.rest.repos.getContent(params);

    if (Array.isArray(response.data)) {
      throw new Error(`Path "${path}" is a directory, not a file`);
    }

    const data = response.data;

    if (data.type !== 'file') {
      throw new Error(`Path "${path}" is not a file`);
    }

    if (!validateFileSize(data.size)) {
      throw new Error(
        `File size exceeds 1MB limit: ${path} (${data.size} bytes)`
      );
    }

    if (!('content' in data) || !data.content) {
      throw new Error(`File content not available: ${path}`);
    }

    if (data.encoding !== 'base64') {
      throw new Error(
        `Unexpected encoding "${data.encoding}" for file: ${path}`
      );
    }

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

type ProgressCallback = (current: number, total: number, filePath: string) => void;

export async function fetchFilesInParallel(
  client: Octokit,
  owner: string,
  repo: string,
  filePaths: string[],
  maxConcurrency: number = 5,
  ref?: string,
  onProgress?: ProgressCallback
): Promise<ParallelFetchResult> {
  if (!validateTotalFileCount(filePaths.length)) {
    throw new Error(
      `Total file count exceeds 100 files limit: ${filePaths.length} files`
    );
  }

  const semaphore = new Semaphore(maxConcurrency);
  const success: FetchedFile[] = [];
  const failed: FailedFile[] = [];

  const fetchWithSemaphore = async (path: string, index: number) => {
    await semaphore.acquire();

    try {
      if (onProgress) {
        onProgress(index + 1, filePaths.length, path);
      }

      const file = await fetchFileContents(client, owner, repo, path, ref);
      success.push(file);
    } catch (error) {
      let errorMessage = 'Unknown error';
      let retryable = true;

      if (error instanceof Error) {
        errorMessage = error.message;

        const errorWithStatus = error as Error & {
          status?: number;
          response?: {
            status?: number;
            headers?: Record<string, string>;
          };
        };
        const status = errorWithStatus.status || errorWithStatus.response?.status;

        if (status === 429) {
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
          retryable = true;
        } else {
          const networkError = error as NodeJS.ErrnoException;
          const networkErrorCodes = [
            'ENOTFOUND',
            'ETIMEDOUT',
            'ECONNREFUSED',
            'ECONNRESET',
            'EHOSTUNREACH',
            'ENETUNREACH',
          ];

          if (networkError.code && networkErrorCodes.includes(networkError.code)) {
            errorMessage = `Network error: ${errorMessage}. Check your internet connection.`;
          }
        }

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

  const fetchPromises = filePaths.map((path, index) => fetchWithSemaphore(path, index));

  await Promise.allSettled(fetchPromises);

  return {
    success,
    failed,
  };
}
