/**
 * GitHub Repository Content Fetcher
 *
 * Handles fetching directory and file contents from GitHub repositories
 */

import type { Octokit } from 'octokit';

/**
 * Repository reference (owner/repo with optional branch)
 *
 * @remarks
 * Backward compatibility: The optional `branch` field allows existing code
 * that only uses `owner` and `repo` to continue working without modifications.
 * When `branch` is undefined, it indicates the repository's default branch should be used.
 */
export interface RepositoryRef {
  owner: string;
  repo: string;
  branch?: string;
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
 * Parse repository path string into owner, repo, and optional branch
 *
 * @param repositoryPath - Repository path in "owner/repo" or "owner/repo#branch" format
 * @returns Object with owner, repo, and optional branch properties
 * @throws Error if repository path format is invalid
 */
export function parseRepositoryPath(repositoryPath: string): RepositoryRef {
  if (!repositoryPath || typeof repositoryPath !== 'string') {
    throw new Error('Invalid repository format: must be "owner/repo"');
  }

  // Task 1.2: Validate invalid formats with # character
  // Check for # at the beginning (#branch)
  if (repositoryPath.startsWith('#')) {
    throw new Error('無効なリポジトリ形式です: owner/repo#branch形式で指定してください');
  }

  // Check for /# pattern (owner/#repo or owner/repo/#branch)
  if (repositoryPath.includes('/#')) {
    throw new Error('無効なリポジトリ形式です: owner/repo#branch形式で指定してください');
  }

  // Check if branch is specified (owner/repo#branch format)
  const hashIndex = repositoryPath.indexOf('#');
  let ownerRepoPart: string;
  let branch: string | undefined;

  if (hashIndex !== -1) {
    // Split at first # to separate owner/repo from branch
    ownerRepoPart = repositoryPath.substring(0, hashIndex);
    const branchPart = repositoryPath.substring(hashIndex + 1);

    // If branch part is empty, treat as undefined (default branch)
    branch = branchPart.length > 0 ? branchPart : undefined;
  } else {
    // No branch specified
    ownerRepoPart = repositoryPath;
    branch = undefined;
  }

  // Parse owner/repo part
  const parts = ownerRepoPart.split('/');

  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    throw new Error('Invalid repository format: must be "owner/repo"');
  }

  return {
    owner: parts[0],
    repo: parts[1],
    branch,
  };
}

/**
 * Fetch all branch names from GitHub repository
 *
 * @param client - Octokit client instance
 * @param owner - Repository owner
 * @param repo - Repository name
 * @returns Array of branch names
 * @throws Error if repository not found or API request fails
 */
export async function fetchBranches(
  client: Octokit,
  owner: string,
  repo: string
): Promise<string[]> {
  try {
    const branches: string[] = [];
    let page = 1;
    const perPage = 100;

    // Fetch all pages until we get an empty response
    while (true) {
      const response = await client.rest.repos.listBranches({
        owner,
        repo,
        per_page: perPage,
        page,
      });

      if (response.data.length === 0) {
        break;
      }

      branches.push(...response.data.map((branch) => branch.name));

      // If we got less than perPage items, we've reached the last page
      if (response.data.length < perPage) {
        break;
      }

      page++;
    }

    return branches;
  } catch (error) {
    if (error instanceof Error) {
      // Extract status code from error (same pattern as fetchDefaultBranch)
      const errorWithStatus = error as {
        status?: number;
        response?: {
          status?: number;
        };
      };
      const status = errorWithStatus.status || errorWithStatus.response?.status;

      if (status === 404) {
        throw new Error(`Repository "${owner}/${repo}" not found`);
      }

      if (status === 401) {
        throw new Error(`Failed to access repository "${owner}/${repo}" (unauthorized)`);
      }

      if (status === 403) {
        throw new Error(`Failed to access repository "${owner}/${repo}" (forbidden)`);
      }

      throw new Error(`Failed to fetch branches: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Fetch default branch name from GitHub repository
 *
 * @param client - Octokit client instance
 * @param owner - Repository owner
 * @param repo - Repository name
 * @returns Default branch name (e.g., 'main', 'master')
 * @throws Error if repository not found or API request fails
 */
export async function fetchDefaultBranch(
  client: Octokit,
  owner: string,
  repo: string
): Promise<string> {
  try {
    const response = await client.rest.repos.get({
      owner,
      repo,
    });

    return response.data.default_branch;
  } catch (error) {
    if (error instanceof Error) {
      // Extract status code from error (same pattern as fetchDirectoryContents)
      const errorWithStatus = error as {
        status?: number;
        response?: {
          status?: number;
        };
      };
      const status = errorWithStatus.status || errorWithStatus.response?.status;

      if (status === 404) {
        throw new Error(`Repository "${owner}/${repo}" not found`);
      }

      if (status === 401) {
        throw new Error(`Failed to access repository "${owner}/${repo}" (unauthorized)`);
      }

      if (status === 403) {
        throw new Error(`Failed to access repository "${owner}/${repo}" (forbidden)`);
      }

      throw new Error(`Failed to fetch default branch: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Fetch directory contents from GitHub repository
 *
 * @param client - Octokit client instance
 * @param owner - Repository owner
 * @param repo - Repository name
 * @param path - Directory path (empty string for root)
 * @param ref - Branch/tag/commit SHA (optional, defaults to repository's default branch)
 * @returns Array of content items (files and directories)
 * @throws Error if repository or path not found, or API request fails
 */
export async function fetchDirectoryContents(
  client: Octokit,
  owner: string,
  repo: string,
  path: string,
  ref?: string
): Promise<ContentItem[]> {
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

    const response = await client.rest.repos.getContent(params);

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
      // Check for response data to detect HTML responses
      const errorWithResponse = error as {
        status?: number;
        response?: {
          status?: number;
          data?: unknown;
          headers?: Record<string, string>;
        };
      };

      // Preserve original error for debugging
      const debugInfo = {
        errorType: error.constructor.name,
        status: errorWithResponse.status || errorWithResponse.response?.status,
        hasResponse: !!errorWithResponse.response,
        contentType: errorWithResponse.response?.headers?.['content-type'],
        message: error.message,
      };

      // Log detailed error for debugging
      if (errorWithResponse.response) {
        const contentType = errorWithResponse.response.headers?.['content-type'] || '';
        const isHtml = contentType.includes('text/html');

        if (isHtml) {
          const enhancedError = new Error(
            `GitHub returned an HTML error page instead of API response. ` +
            `This may indicate: (1) Invalid API endpoint, (2) GitHub service issue, or (3) Rate limit exceeded. ` +
            `Repository: ${owner}/${repo}, Path: ${path}${ref ? `, Branch: ${ref}` : ''}. ` +
            `Status: ${debugInfo.status || 'unknown'}, Content-Type: ${contentType}`
          );
          // Attach debug info to error object
          (enhancedError as Error & { debugInfo?: unknown }).debugInfo = {
            ...debugInfo,
            responseDataType: typeof errorWithResponse.response.data,
            responseDataSnippet: typeof errorWithResponse.response.data === 'string'
              ? (errorWithResponse.response.data as string).substring(0, 200)
              : 'Not a string',
          };
          throw enhancedError;
        }
      }

      // Check for HTTP error with status code
      const status = errorWithResponse.status || errorWithResponse.response?.status;
      if (status) {
        // Task 3.3: Enhanced branch-related error handling
        if (status === 404) {
          // Branch specified but not found
          if (ref !== undefined) {
            // Check if .kiro directory path is involved
            if (path.includes('.kiro')) {
              const kiroIndex = path.indexOf('.kiro');
              if (kiroIndex > 0) {
                // Extract subdirectory path (everything before .kiro/)
                const subdir = path.substring(0, kiroIndex).replace(/\/$/, '');
                throw new Error(
                  `.kiro folder not found in subdirectory ${subdir} on branch ${ref}`
                );
              }
              // .kiro path at root level
              throw new Error(`.kiro folder not found on branch ${ref}`);
            }
            // No .kiro in path - branch itself not found
            throw new Error(`Branch not found: ${ref}`);
          }

          // No branch specified - check subdirectory error
          const kiroIndex = path.indexOf('.kiro');
          if (kiroIndex > 0) {
            // Extract subdirectory path (everything before .kiro/)
            const subdir = path.substring(0, kiroIndex).replace(/\/$/, '');
            throw new Error(
              `Subdirectory "${subdir}" or .kiro folder not found in repository "${owner}/${repo}"`
            );
          }

          throw new Error(
            `Repository "${owner}/${repo}" or path "${path}" not found`
          );
        }

        // Task 3.3: Handle 401/403 errors for branch access
        if (status === 401 || status === 403) {
          if (ref !== undefined) {
            throw new Error(
              `Failed to access branch: ${ref} (possible insufficient permissions)`
            );
          }
        }
      }

      // Enhance error message with debug info
      const enhancedError = new Error(
        `Failed to fetch directory contents: ${error.message}. Debug: ${JSON.stringify(debugInfo)}`
      );
      (enhancedError as Error & { debugInfo?: unknown }).debugInfo = debugInfo;
      throw enhancedError;
    }
    throw error;
  }
}
