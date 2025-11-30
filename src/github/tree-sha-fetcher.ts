import type { Octokit } from 'octokit';

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

  if (status === 404) {
    throw new Error(
      branch
        ? `Branch not found: ${branch}`
        : `Repository not found: ${owner}/${repo}`
    );
  }

  if (status === 401) {
    throw new Error('Authentication error: Please set GITHUB_TOKEN environment variable');
  }

  if (status === 403) {
    throw new Error(
      branch
        ? `Permission denied: Cannot access branch ${branch}`
        : `Permission denied: Cannot access repository ${owner}/${repo}`
    );
  }

  throw new Error(`Failed to retrieve tree SHA: ${error.message}`);
}

export async function getTreeSha(
  client: Octokit,
  owner: string,
  repo: string,
  branch?: string
): Promise<string> {
  try {
    if (branch) {
      const branchInfo = await client.rest.repos.getBranch({
        owner,
        repo,
        branch,
      });

      return branchInfo.data.commit.sha;
    }

    const repoInfo = await client.rest.repos.get({
      owner,
      repo,
    });

    const defaultBranch = repoInfo.data.default_branch;

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
