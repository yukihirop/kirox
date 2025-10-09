/**
 * Project Suggester Service
 *
 * Fetches available projects from GitHub and provides selection UI
 * Task 1.1: プロジェクトサジェスターサービスのコア機能を実装
 */

import type { Octokit } from 'octokit';
import { fetchDirectoryContents } from '@/github/fetcher.js';
import type { RepositoryRef } from '@/github/fetcher.js';
import type { Logger } from '@/reporting/logger.js';

/**
 * Project suggestion result
 */
export interface ProjectSuggestionResult {
  /** Selected project names */
  projects: string[];
  /** Whether suggestion was successful (true) or fallback to manual (false) */
  success: boolean;
  /** Error message when success is false (optional) */
  errorMessage?: string;
}

/**
 * Project suggestion options
 */
export interface ProjectSuggestionOptions {
  /** GitHub repository reference (owner, repo, branch) */
  repository: RepositoryRef;
  /** Optional subdirectory path */
  subdir?: string;
  /** GitHub client instance */
  client: Octokit;
  /** Logger instance for verbose output */
  logger: Logger;
  /** Enable verbose logging */
  verbose: boolean;
}

/**
 * Get appropriate error message based on error status
 *
 * @param error - Error object from GitHub API
 * @returns User-friendly error message
 */
function getErrorMessage(error: unknown): string {
  // Default error message for generic failures
  const defaultMessage = 'Failed to fetch project list from GitHub';

  // Check if error has status property (GitHub API error)
  if (error && typeof error === 'object' && 'status' in error) {
    const status = (error as { status: number }).status;

    if (status === 404) {
      return '.kiro/specs/ directory not found in repository';
    }
    if (status === 401 || status === 403) {
      return 'Authentication error: Please set GITHUB_TOKEN environment variable';
    }
  }

  return defaultMessage;
}

/**
 * Suggest projects from GitHub repository
 *
 * Fetches available projects from .kiro/specs/ directory and returns them.
 * Falls back gracefully on any error (returns success: false).
 *
 * @param options - Suggestion options
 * @returns Project suggestion result with project list
 */
export async function suggestProjects(
  options: ProjectSuggestionOptions
): Promise<ProjectSuggestionResult> {
  const { repository, subdir, client, logger, verbose } = options;

  // Build path: {subdir}/.kiro/specs/ or .kiro/specs/
  const path = subdir ? `${subdir}/.kiro/specs/` : '.kiro/specs/';

  try {
    // Verbose logging: API call details
    if (verbose) {
      logger.info('Fetching available projects from GitHub', {
        repository: `${repository.owner}/${repository.repo}`,
        branch: repository.branch || 'default',
        path,
      });
    }

    // Fetch directory contents from GitHub
    const contents = await fetchDirectoryContents(
      client,
      repository.owner,
      repository.repo,
      path,
      repository.branch
    );

    // Filter directories only
    const projects = contents
      .filter((item) => item.type === 'dir')
      .map((item) => item.name);

    // Check if any projects found
    if (projects.length === 0) {
      const errorMessage = 'No projects found in .kiro/specs/';
      if (verbose) {
        logger.error(errorMessage, {
          repository: `${repository.owner}/${repository.repo}`,
        });
      }
      return { projects: [], success: false, errorMessage };
    }

    // Verbose logging: Success
    if (verbose) {
      logger.info('Successfully fetched projects', {
        count: projects.length,
        projects,
      });
    }

    return { projects, success: true };
  } catch (error) {
    // Determine error message based on error type
    const errorMessage = getErrorMessage(error);

    // Verbose logging: Error details
    if (verbose) {
      logger.error('Failed to fetch projects from GitHub', {
        error: error instanceof Error ? error.message : String(error),
        repository: `${repository.owner}/${repository.repo}`,
      });
    }

    // Fallback: Return empty projects with success: false and error message
    return { projects: [], success: false, errorMessage };
  }
}
