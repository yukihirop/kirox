/**
 * Tree-Based Project Scanner
 *
 * Scans GitHub repositories using Tree API to find .kiro/specs/ projects across all subdirectories
 */

import type { Octokit } from 'octokit';
import type { Logger } from '../reporting/logger.js';
import type { RepositoryRef } from './fetcher.js';
import { getTreeSha } from './tree-sha-fetcher.js';
import { parseTreeResponse, type TreeItem } from './tree-response-parser.js';
import { buildProjectLocations, type ProjectLocation } from './project-location-builder.js';

/**
 * Result of tree-based project scan
 */
export interface TreeScanResult {
  /** List of discovered projects */
  projects: ProjectLocation[];
  /** Whether the scan was successful */
  success: boolean;
  /** Whether the tree response was truncated (>100,000 entries) */
  truncated: boolean;
  /** Error message if scan failed */
  errorMessage?: string;
}

/**
 * Options for tree-based project scan
 */
export interface TreeScanOptions {
  /** Target repository reference */
  repository: RepositoryRef;
  /** Octokit client for GitHub API calls */
  client: Octokit;
  /** Logger for reporting scan progress */
  logger: Logger;
  /** Enable verbose logging */
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
    if (verbose) {
      logger.verbose(`Fetching tree SHA for ${repository.owner}/${repository.repo}#${repository.branch}`);
    }

    const treeSha = await getTreeSha(
      client,
      repository.owner,
      repository.repo,
      repository.branch
    );

    // Step 2: Call Tree API with recursive=1
    if (verbose) {
      logger.verbose(`Fetching repository tree (recursive) with SHA: ${treeSha}`);
    }

    const treeResponse = await client.rest.git.getTree({
      owner: repository.owner,
      repo: repository.repo,
      tree_sha: treeSha,
      recursive: '1',
    });

    // Step 3: Parse tree response to extract .kiro/specs/ directories
    if (verbose) {
      logger.verbose(`Parsing tree response (${treeResponse.data.tree.length} entries)`);
    }

    const parsedItems = parseTreeResponse(treeResponse.data.tree as TreeItem[]);

    if (verbose) {
      logger.verbose(`Found ${parsedItems.length} .kiro/specs/ directories`);
    }

    // Step 4: Build ProjectLocation objects with display names
    const projects = buildProjectLocations(parsedItems);

    // Step 5: Detect and propagate truncated flag
    const truncated = treeResponse.data.truncated || false;

    if (truncated && verbose) {
      logger.verbose('Warning: Tree response was truncated (>100,000 entries)');
    }

    return {
      projects,
      success: true,
      truncated,
    };
  } catch (error) {
    // Error handling: Return error result with message
    const errorMessage = error instanceof Error ? error.message : String(error);

    logger.error(`Failed to scan projects: ${errorMessage}`);

    return {
      projects: [],
      success: false,
      truncated: false,
      errorMessage,
    };
  }
}
