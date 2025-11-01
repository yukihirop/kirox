/**
 * Tree-Based Project Scanner
 *
 * Scans GitHub repositories using Tree API to find .kiro/specs/ projects across all subdirectories
 */

import type { Octokit } from 'octokit';
import { PinoLogger } from '../reporting/pino-logger.js';
import type { RepositoryRef } from './fetcher.js';
import { getTreeSha } from './tree-sha-fetcher.js';
import { parseTreeResponse, type TreeItem } from './tree-response-parser.js';
import { buildProjectLocations, type ProjectLocation } from './project-location-builder.js';

/** Result of tree-based project scan - @internal Internal type - not exported */
interface TreeScanResult {
  projects: ProjectLocation[];
  success: boolean;
  truncated: boolean;
  entryCount: number;
  errorMessage?: string;
}

/** Options for tree-based project scan - @internal Internal type - not exported */
interface TreeScanOptions {
  repository: RepositoryRef;
  client: Octokit;
  logger: PinoLogger;
  verbose: boolean;
}

/**
 * Scan repository for .kiro/specs/ projects using GitHub Tree API
 *
 * This function performs a recursive tree scan to discover all projects
 * across the entire repository, including subdirectories.
 *
 * Process:
 * 1. Get tree SHA from branch commit (via getTreeSha)
 * 2. Call Tree API with recursive=1 to get full repository tree
 * 3. Parse response to extract .kiro/specs/ directories (via parseTreeResponse)
 * 4. Build ProjectLocation objects with display names (via buildProjectLocations)
 * 5. Detect and propagate truncated flag from Tree API
 *
 * @param options - Scan options including repository, client, logger, verbose
 * @returns TreeScanResult with projects list, success status, and truncated flag
 */
export async function scanProjectsAcrossSubdirs(
  options: TreeScanOptions
): Promise<TreeScanResult> {
  const { repository, client, logger, verbose } = options;

  try {
    // Step 1: Get tree SHA from branch
    logger.debug(`Fetching tree SHA for ${repository.owner}/${repository.repo}#${repository.branch}`);

    const treeSha = await getTreeSha(
      client,
      repository.owner,
      repository.repo,
      repository.branch
    );

    // Step 2: Call Tree API with recursive=1
    logger.debug(`Fetching repository tree (recursive) with SHA: ${treeSha}`);

    const treeResponse = await client.rest.git.getTree({
      owner: repository.owner,
      repo: repository.repo,
      tree_sha: treeSha,
      recursive: '1',
    });

    // Step 3: Parse tree response to extract .kiro/specs/ directories
    const entryCount = treeResponse.data.tree.length; // Task 2.5: Store entry count

    logger.debug(`Parsing tree response (${entryCount} entries)`);

    const parsedItems = parseTreeResponse(treeResponse.data.tree as TreeItem[]);

    logger.debug(`Found ${parsedItems.length} .kiro/specs/ directories`);

    // Step 4: Build ProjectLocation objects with display names
    const projects = buildProjectLocations(parsedItems);

    // Step 4.5: Sort projects alphabetically (Task 2.2)
    // Sort by subdirectory path first, then by project name
    // Root projects (subdir === '') should come first
    projects.sort((a, b) => {
      // Root directory projects come first
      if (a.subdir === '' && b.subdir !== '') return -1;
      if (a.subdir !== '' && b.subdir === '') return 1;

      // Both root or both subdirectory: compare displayName alphabetically
      return a.displayName.localeCompare(b.displayName);
    });

    // Step 5: Detect and propagate truncated flag
    const truncated = treeResponse.data.truncated || false;

    if (truncated) {
      logger.debug('Warning: Tree response was truncated (>100,000 entries)');
    }

    return {
      projects,
      success: true,
      truncated,
      entryCount, // Task 2.5: Return entry count (Requirement 8.4)
    };
  } catch (error) {
    // Enhanced error handling (Task 2.3)
    let errorMessage: string;

    // Check for HTTP status code errors
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
      // Generic error message for non-HTTP errors
      const message = error instanceof Error ? error.message : String(error);
      errorMessage = `Failed to call Tree API: ${message}`;
    }

    logger.error(`Failed to scan projects: ${errorMessage}`);

    return {
      projects: [],
      success: false,
      truncated: false,
      entryCount: 0, // Task 2.5: Return 0 on error
      errorMessage,
    };
  }
}
