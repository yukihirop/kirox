/**
 * Tree-Based Directory Scanner
 *
 * Scans GitHub repositories using Tree API to find all directories across the repository
 * Requirement 9.1: Interactive subdirectory selection UI for --steering mode
 */

import type { Octokit } from 'octokit';
import { PinoLogger } from '../reporting/pino-logger.js';
import type { RepositoryRef } from './fetcher.js';
import { getTreeSha } from './tree-sha-fetcher.js';

/**
 * Directory location metadata
 */
export interface DirectoryLocation {
  /** Directory path (empty string for root) */
  path: string;
  /** Display name for UI ("(root)" or "path/to/dir") */
  displayName: string;
  /** Git SHA from Tree API */
  sha: string;
}

/**
 * Result of directory scan
 */
export interface DirectoryScanResult {
  /** Scan success flag */
  success: boolean;
  /** List of discovered directories */
  directories: DirectoryLocation[];
  /** Whether the tree response was truncated (>100,000 entries) */
  truncated: boolean;
  /** Error message if scan failed */
  errorMessage?: string;
}

/**
 * Options for directory scan
 */
export interface DirectoryScanOptions {
  /** Target repository reference */
  repository: RepositoryRef;
  /** Octokit client for GitHub API calls */
  client: Octokit;
  /** Logger for reporting scan progress */
  logger: PinoLogger;
  /** Enable verbose logging */
  verbose: boolean;
}

/**
 * Extract parent directory path from .kiro/steering path
 *
 * Examples:
 * - "lib/a/.kiro/steering" → "lib/a"
 * - ".kiro/steering" → "" (root)
 *
 * @param steeringPath - Full path to .kiro/steering directory
 * @returns Parent directory path (empty string for root)
 */
function extractParentDirectory(steeringPath: string): string {
  if (steeringPath === '.kiro/steering') {
    return ''; // Root directory
  }
  return steeringPath.replace(/\/.kiro\/steering$/, '');
}

/**
 * Scan repository for directories using GitHub Tree API
 *
 * This function performs a recursive tree scan to discover all directories
 * containing .kiro/steering directories.
 *
 * Process:
 * 1. Get tree SHA from branch commit (via getTreeSha)
 * 2. Call Tree API with recursive=1 to get full repository tree
 * 3. Filter tree entries to find .kiro/steering directories
 * 4. Extract parent directories where .kiro/steering exists
 * 5. Remove duplicates and map to DirectoryLocation objects
 * 6. Detect and propagate truncated flag from Tree API
 *
 * @param options - Scan options including repository, client, logger, verbose
 * @returns DirectoryScanResult with parent directories list, success status, and truncated flag
 */
export async function scanDirectoriesAcrossRepo(
  options: DirectoryScanOptions
): Promise<DirectoryScanResult> {
  const { repository, client, logger, verbose } = options;

  try {
    // Step 1: Get tree SHA from branch
    logger.debug(
      `Fetching tree SHA for ${repository.owner}/${repository.repo}#${repository.branch}`
    );

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

    // Step 3: Filter tree entries to find .kiro/steering directories
    logger.debug(`Parsing tree response (${treeResponse.data.tree.length} entries)`);

    // Find all .kiro/steering directories
    const steeringDirs = treeResponse.data.tree
      .filter((item) => item.type === 'tree' && item.path?.endsWith('.kiro/steering'));

    // Extract parent directories where .kiro/steering exists (remove duplicates with Set)
    const parentPaths = new Set(
      steeringDirs.map((item) => extractParentDirectory(item.path!))
    );

    // Convert to DirectoryLocation array
    const directories: DirectoryLocation[] = Array.from(parentPaths).map((path) => ({
      path,
      displayName: path === '' ? '(root)' : path,
      sha: '', // SHA not needed for parent directories
    }));

    logger.debug(`Found ${directories.length} directories with .kiro/steering`);

    // Step 4: Detect and propagate truncated flag
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
    // Enhanced error handling (Requirement 9.7)
    let errorMessage: string;

    // Get error message
    const message = error instanceof Error ? error.message : String(error);

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
          errorMessage = `Failed to scan directories: ${message}`;
      }
    } else {
      // Check error message patterns from getTreeSha
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
