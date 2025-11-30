import type { Octokit } from 'octokit';
import { PinoLogger } from '../reporting/pino-logger.js';
import type { RepositoryRef } from './fetcher.js';
import { getTreeSha } from './tree-sha-fetcher.js';
import { parseTreeResponse, type TreeItem } from './tree-response-parser.js';
import { buildProjectLocations, type ProjectLocation } from './project-location-builder.js';

interface TreeScanResult {
  projects: ProjectLocation[];
  success: boolean;
  truncated: boolean;
  entryCount: number;
  errorMessage?: string;
}

interface TreeScanOptions {
  repository: RepositoryRef;
  client: Octokit;
  logger: PinoLogger;
  verbose: boolean;
}

export async function scanProjectsAcrossSubdirs(
  options: TreeScanOptions
): Promise<TreeScanResult> {
  const { repository, client, logger } = options;

  try {
    logger.debug(`Fetching tree SHA for ${repository.owner}/${repository.repo}#${repository.branch}`);

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

    const entryCount = treeResponse.data.tree.length;

    logger.debug(`Parsing tree response (${entryCount} entries)`);

    const parsedItems = parseTreeResponse(treeResponse.data.tree as TreeItem[]);

    logger.debug(`Found ${parsedItems.length} .kiro/specs/ directories`);

    const projects = buildProjectLocations(parsedItems);

    projects.sort((a, b) => {
      if (a.subdir === '' && b.subdir !== '') return -1;
      if (a.subdir !== '' && b.subdir === '') return 1;

      return a.displayName.localeCompare(b.displayName);
    });

    const truncated = treeResponse.data.truncated || false;

    if (truncated) {
      logger.debug('Warning: Tree response was truncated (>100,000 entries)');
    }

    return {
      projects,
      success: true,
      truncated,
      entryCount,
    };
  } catch (error) {
    let errorMessage: string;

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
          errorMessage = `Failed to call Tree API: ${errorWithStatus.message}`;
      }
    } else {
      const message = error instanceof Error ? error.message : String(error);
      errorMessage = `Failed to call Tree API: ${message}`;
    }

    logger.error(`Failed to scan projects: ${errorMessage}`);

    return {
      projects: [],
      success: false,
      truncated: false,
      entryCount: 0,
      errorMessage,
    };
  }
}
