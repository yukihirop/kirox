import type { Octokit } from 'octokit';
import { PinoLogger } from '../reporting/pino-logger.js';
import type { RepositoryRef } from './fetcher.js';
import { getTreeSha } from './tree-sha-fetcher.js';

export interface DirectoryLocation {
  path: string;
  displayName: string;
  sha: string;
}

export interface DirectoryScanResult {
  success: boolean;
  directories: DirectoryLocation[];
  truncated: boolean;
  errorMessage?: string;
}

export interface DirectoryScanOptions {
  repository: RepositoryRef;
  client: Octokit;
  logger: PinoLogger;
  verbose: boolean;
}

function extractParentDirectory(steeringPath: string): string {
  if (steeringPath === '.kiro/steering') {
    return '';
  }
  return steeringPath.replace(/\/.kiro\/steering$/, '');
}

export async function scanDirectoriesAcrossRepo(
  options: DirectoryScanOptions
): Promise<DirectoryScanResult> {
  const { repository, client, logger } = options;

  try {
    logger.debug(
      `Fetching tree SHA for ${repository.owner}/${repository.repo}#${repository.branch}`
    );

    const treeSha = await getTreeSha(
      client,
      repository.owner,
      repository.repo,
      repository.branch
    );

    logger.debug(`Fetching repository tree (recursive) with SHA: ${treeSha}`);

    const treeResponse = await client.rest.git.getTree({
      owner: repository.owner,
      repo: repository.repo,
      tree_sha: treeSha,
      recursive: '1',
    });

    logger.debug(`Parsing tree response (${treeResponse.data.tree.length} entries)`);

    const steeringDirs = treeResponse.data.tree
      .filter((item) => item.type === 'tree' && item.path?.endsWith('.kiro/steering'));

    const parentPaths = new Set(
      steeringDirs.map((item) => extractParentDirectory(item.path!))
    );

    const directories: DirectoryLocation[] = Array.from(parentPaths).map((path) => ({
      path,
      displayName: path === '' ? '(root)' : path,
      sha: '',
    }));

    logger.debug(`Found ${directories.length} directories with .kiro/steering`);

    const truncated = treeResponse.data.truncated || false;

    if (truncated) {
      logger.debug('Repository is very large, some directories may not be shown');
    }

    return {
      success: true,
      directories,
      truncated,
    };
  } catch (error) {
    let errorMessage: string;

    const message = error instanceof Error ? error.message : String(error);

    const errorWithStatus = error as Error & { status?: number };

    if (errorWithStatus.status) {
      switch (errorWithStatus.status) {
        case 404:
          errorMessage = 'Repository or branch not found';
          break;
        case 409:
          errorMessage = 'Repository is empty';
          break;
        case 401:
        case 403:
          errorMessage = 'Authentication error: Please set GITHUB_TOKEN environment variable';
          break;
        default:
          errorMessage = `Failed to scan directories: ${message}`;
      }
    } else {
      if (message.includes('Branch not found') || message.includes('Repository not found')) {
        errorMessage = 'Repository or branch not found';
      } else if (message.includes('Authentication error') || message.includes('Permission denied')) {
        errorMessage = 'Authentication error: Please set GITHUB_TOKEN environment variable';
      } else {
        errorMessage = `Failed to scan directories: ${message}`;
      }
    }

    return {
      success: false,
      directories: [],
      truncated: false,
      errorMessage,
    };
  }
}
