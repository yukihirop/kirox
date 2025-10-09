/**
 * Project Suggester Service
 *
 * Fetches available projects from GitHub and provides selection UI
 * Task 1.1: プロジェクトサジェスターサービスのコア機能を実装
 * Task 2.1: selectプロンプトによる単一プロジェクト選択機能を実装
 */

import type { Octokit } from 'octokit';
import { select } from '@inquirer/prompts';
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
 * Special value for multiple selection mode
 */
export const MULTIPLE_SELECTION_MARKER = '__MULTIPLE__';

/**
 * Choice item for select/checkbox prompts
 */
interface Choice {
  name: string;
  value: string;
}

/**
 * Build choices for project selection prompt
 *
 * Creates an array of choice objects for the select prompt,
 * including project names and a special multiple selection option.
 *
 * @param projects - Array of project names
 * @returns Array of choice objects
 */
function buildProjectChoices(projects: string[]): Choice[] {
  return [
    ...projects.map((project) => ({
      name: project,
      value: project,
    })),
    {
      name: '[Select multiple projects...]',
      value: MULTIPLE_SELECTION_MARKER,
    },
  ];
}

/**
 * Prompt user to select a single project from list
 *
 * Displays a radio button UI (select prompt) with project names.
 * Includes a special option to switch to multiple selection mode.
 *
 * @param projects - Array of project names
 * @returns Selected project name or MULTIPLE_SELECTION_MARKER
 */
export async function promptSingleProject(projects: string[]): Promise<string> {
  const choices = buildProjectChoices(projects);

  const selected = await select({
    message: 'Select a project',
    choices,
    pageSize: 10,
    loop: true,
  });

  return selected;
}

/**
 * Format single project name to array
 *
 * Converts a single project name string to an array format
 * suitable for ParsedArguments.projects field.
 *
 * @param projectName - Single project name
 * @returns Array containing the project name, or empty array if empty string
 */
export function formatSingleProjectToArray(projectName: string): string[] {
  if (projectName === '') {
    return [];
  }
  return [projectName];
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
