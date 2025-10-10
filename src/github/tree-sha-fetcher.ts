/**
 * GitHub Tree SHA Fetcher
 *
 * Retrieves Tree SHA from repository branches for GitHub Tree API calls
 */

import type { Octokit } from 'octokit';

/**
 * Handle GitHub API errors and throw user-friendly error messages
 *
 * @param error - Original error from GitHub API
 * @param owner - Repository owner
 * @param repo - Repository name
 * @param branch - Optional branch name
 * @throws Error with specific message based on error type
 */
function handleTreeShaError(
  error: unknown,
  owner: string,
  repo: string,
  branch?: string
): never {
  if (!(error instanceof Error)) {
    throw error;
  }

  const errorWithStatus = error as { status?: number };

  if (!errorWithStatus.status) {
    throw new Error(`Failed to retrieve tree SHA: ${error.message}`);
  }

  const status = errorWithStatus.status;

  // 404: Not Found
  if (status === 404) {
    throw new Error(
      branch
        ? `Branch not found: ${branch}`
        : `Repository not found: ${owner}/${repo}`
    );
  }

  // 401: Unauthorized
  if (status === 401) {
    throw new Error('Authentication error: Please set GITHUB_TOKEN environment variable');
  }

  // 403: Forbidden
  if (status === 403) {
    throw new Error(
      branch
        ? `Permission denied: Cannot access branch ${branch}`
        : `Permission denied: Cannot access repository ${owner}/${repo}`
    );
  }

  // Generic error
  throw new Error(`Failed to retrieve tree SHA: ${error.message}`);
}

/**
 * Get Tree SHA from repository
 *
 * @param client - Octokit client instance
 * @param owner - Repository owner
 * @param repo - Repository name
 * @param branch - Optional branch name (if not specified, uses default branch)
 * @returns Tree SHA (commit SHA) for the branch
 * @throws Error with specific message based on error type:
 *   - 404: Branch or repository not found
 *   - 401: Authentication required
 *   - 403: Permission denied
 *   - Other: Generic failure message
 */
export async function getTreeSha(
  client: Octokit,
  owner: string,
  repo: string,
  branch?: string
): Promise<string> {
  try {
    // If branch is specified, get Tree SHA directly
    if (branch) {
      const branchInfo = await client.rest.repos.getBranch({
        owner,
        repo,
        branch,
      });

      return branchInfo.data.commit.sha;
    }

    // If branch is not specified, get default branch first
    const repoInfo = await client.rest.repos.get({
      owner,
      repo,
    });

    const defaultBranch = repoInfo.data.default_branch;

    // Get Tree SHA from default branch
    const branchInfo = await client.rest.repos.getBranch({
      owner,
      repo,
      branch: defaultBranch,
    });

    return branchInfo.data.commit.sha;
  } catch (error) {
    handleTreeShaError(error, owner, repo, branch);
  }
}
