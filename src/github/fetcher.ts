import type { Octokit } from 'octokit';

export interface RepositoryRef {
  owner: string;
  repo: string;
  branch?: string;
}

export interface ContentItem {
  name: string;
  path: string;
  type: 'file' | 'dir';
  sha: string;
  size?: number;
  download_url?: string | null;
}

export function parseRepositoryPath(repositoryPath: string): RepositoryRef {
  if (!repositoryPath || typeof repositoryPath !== 'string') {
    throw new Error('Invalid repository format: must be "owner/repo"');
  }

  if (repositoryPath.startsWith('#')) {
    throw new Error('無効なリポジトリ形式です: owner/repo#branch形式で指定してください');
  }

  if (repositoryPath.includes('/#')) {
    throw new Error('無効なリポジトリ形式です: owner/repo#branch形式で指定してください');
  }

  const hashIndex = repositoryPath.indexOf('#');
  let ownerRepoPart: string;
  let branch: string | undefined;

  if (hashIndex !== -1) {
    ownerRepoPart = repositoryPath.substring(0, hashIndex);
    const branchPart = repositoryPath.substring(hashIndex + 1);

    branch = branchPart.length > 0 ? branchPart : undefined;
  } else {
    ownerRepoPart = repositoryPath;
    branch = undefined;
  }

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

export async function fetchBranches(
  client: Octokit,
  owner: string,
  repo: string
): Promise<string[]> {
  try {
    const branches: string[] = [];
    let page = 1;
    const perPage = 100;

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

      if (response.data.length < perPage) {
        break;
      }

      page++;
    }

    return branches;
  } catch (error) {
    if (error instanceof Error) {
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

export async function fetchDirectoryContents(
  client: Octokit,
  owner: string,
  repo: string,
  path: string,
  ref?: string
): Promise<ContentItem[]> {
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

    const response = await client.rest.repos.getContent(params);

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
      const errorWithResponse = error as {
        status?: number;
        response?: {
          status?: number;
          data?: unknown;
          headers?: Record<string, string>;
        };
      };

      const debugInfo = {
        errorType: error.constructor.name,
        status: errorWithResponse.status || errorWithResponse.response?.status,
        hasResponse: !!errorWithResponse.response,
        contentType: errorWithResponse.response?.headers?.['content-type'],
        message: error.message,
      };

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

      const status = errorWithResponse.status || errorWithResponse.response?.status;
      if (status) {
        if (status === 404) {
          if (ref !== undefined) {
            if (path.includes('.kiro')) {
              const kiroIndex = path.indexOf('.kiro');
              if (kiroIndex > 0) {
                const subdir = path.substring(0, kiroIndex).replace(/\/$/, '');
                throw new Error(
                  `.kiro folder not found in subdirectory ${subdir} on branch ${ref}`
                );
              }
              throw new Error(`.kiro folder not found on branch ${ref}`);
            }
            throw new Error(`Branch not found: ${ref}`);
          }

          const kiroIndex = path.indexOf('.kiro');
          if (kiroIndex > 0) {
            const subdir = path.substring(0, kiroIndex).replace(/\/$/, '');
            throw new Error(
              `Subdirectory "${subdir}" or .kiro folder not found in repository "${owner}/${repo}"`
            );
          }

          throw new Error(
            `Repository "${owner}/${repo}" or path "${path}" not found`
          );
        }

        if (status === 401 || status === 403) {
          if (ref !== undefined) {
            throw new Error(
              `Failed to access branch: ${ref} (possible insufficient permissions)`
            );
          }
        }
      }

      const enhancedError = new Error(
        `Failed to fetch directory contents: ${error.message}. Debug: ${JSON.stringify(debugInfo)}`
      );
      (enhancedError as Error & { debugInfo?: unknown }).debugInfo = debugInfo;
      throw enhancedError;
    }
    throw error;
  }
}
