/**
 * Project Suggester Service
 *
 * Fetches available projects from GitHub and provides selection UI
 * Task 1.1: プロジェクトサジェスターサービスのコア機能を実装
 * Task 2.1: selectプロンプトによる単一プロジェクト選択機能を実装
 */

import type { Octokit } from 'octokit';
import { select, checkbox } from '@inquirer/prompts';
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
  /** Detailed error information for debugging (optional) */
  errorDetails?: {
    repository: string;
    path: string;
    error: string;
  };
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
 * Build choices for multiple project selection (checkbox prompt)
 *
 * Creates an array of choice objects for the checkbox prompt.
 * Unlike single selection, this does not include the special multiple selection option.
 *
 * @param projects - Array of project names
 * @returns Array of choice objects
 */
function buildMultipleProjectChoices(projects: string[]): Choice[] {
  return projects.map((project) => ({
    name: project,
    value: project,
  }));
}

/**
 * Prompt user to select multiple projects from list
 *
 * Displays a checkbox UI (checkbox prompt) with project names.
 * Users can select multiple projects using Space key and confirm with Enter.
 *
 * @param projects - Array of project names
 * @returns Array of selected project names
 */
export async function promptMultipleProjects(projects: string[]): Promise<string[]> {
  const choices = buildMultipleProjectChoices(projects);

  const selected = await checkbox({
    message: 'Select projects (Space to select, Enter to confirm)',
    choices,
    pageSize: 10,
    loop: true,
  });

  return selected;
}

/**
 * Prompt user to select multiple projects with validation
 *
 * Displays a checkbox UI with validation that at least one project must be selected.
 * If no projects are selected, displays an error message and prompts again.
 *
 * @param projects - Array of project names
 * @returns Array of selected project names (guaranteed to have at least one item)
 */
export async function promptMultipleProjectsWithValidation(
  projects: string[]
): Promise<string[]> {
   
  while (true) {
    const selected = await promptMultipleProjects(projects);

    // Validate: at least one project must be selected
    if (selected.length === 0) {
      console.error('Please select at least one project');
      continue;
    }

    return selected;
  }
}

/**
 * Format multiple project names to comma-separated string
 *
 * Converts an array of project names to a comma-separated string format
 * suitable for ParsedArguments.projects field.
 *
 * @param projects - Array of project names
 * @returns Comma-separated string of project names
 */
export function formatMultipleProjectsToString(projects: string[]): string {
  return projects.join(',');
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
 * Show loading message
 *
 * Displays a loading message in the console.
 *
 * @param message - Loading message to display
 */
function showLoadingMessage(message: string): void {
  process.stdout.write(message);
}

/**
 * Clear loading message
 *
 * Clears the current line in the console.
 */
function clearLoadingMessage(): void {
  process.stdout.write('\r\x1b[K');
}

/**
 * Suggest projects from GitHub repository
 *
 * Fetches available projects from .kiro/specs/ directory and returns them.
 * Falls back gracefully on any error (returns success: false).
 *
 * Task 5.1: ローディングメッセージ表示機能を実装
 * - GitHub API呼び出し前に「Fetching available projects...」メッセージを表示
 * - 3秒経過後に「Please wait...」追加メッセージを表示
 * - API呼び出し完了後にローディングメッセージをクリア
 *
 * @param options - Suggestion options
 * @returns Project suggestion result with project list
 */
export async function suggestProjects(
  options: ProjectSuggestionOptions
): Promise<ProjectSuggestionResult> {
  const { repository, subdir, client, logger, verbose } = options;

  // Build path: {subdir}/.kiro/specs or .kiro/specs (no trailing slash)
  const path = subdir ? `${subdir}/.kiro/specs` : '.kiro/specs';

  // Show loading message (Task 5.1)
  showLoadingMessage('Fetching available projects...');

  // Set up timeout for additional wait message (Task 5.1)
  let waitMessageTimeout: NodeJS.Timeout | null = null;
  waitMessageTimeout = setTimeout(() => {
    clearLoadingMessage();
    showLoadingMessage('Fetching available projects... Please wait...');
  }, 3000);

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

    // Clear timeout and loading message (Task 5.1)
    if (waitMessageTimeout) {
      clearTimeout(waitMessageTimeout);
    }
    clearLoadingMessage();

    // Filter directories only
    const projects = contents
      .filter((item) => item.type === 'dir')
      .map((item) => item.name);

    // Check if any projects found
    if (projects.length === 0) {
      const errorMessage = 'No projects found in .kiro/specs/';
      const repoPath = `${repository.owner}/${repository.repo}${repository.branch ? `#${repository.branch}` : ''}`;
      if (verbose) {
        logger.error(errorMessage, {
          repository: repoPath,
        });
      }
      return {
        projects: [],
        success: false,
        errorMessage,
        errorDetails: {
          repository: repoPath,
          path,
          error: errorMessage,
        },
      };
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
    // Clear timeout and loading message on error (Task 5.1)
    if (waitMessageTimeout) {
      clearTimeout(waitMessageTimeout);
    }
    clearLoadingMessage();

    // Determine error message based on error type
    const errorMessage = getErrorMessage(error);
    const repoPath = `${repository.owner}/${repository.repo}${repository.branch ? `#${repository.branch}` : ''}`;
    const actualError = error instanceof Error ? error.message : String(error);

    // Verbose logging: Error details with full error object
    if (verbose) {
      const errorObj = error as Error & { debugInfo?: unknown };
      logger.error('Failed to fetch projects from GitHub', {
        error: actualError,
        repository: repoPath,
        path,
        // Include debug info if available
        debugInfo: errorObj.debugInfo,
        // Include full error object for debugging
        fullError: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack,
          ...(error as unknown as Record<string, unknown>),
        } : error,
      });
    }

    // Fallback: Return empty projects with success: false, error message, and details
    return {
      projects: [],
      success: false,
      errorMessage,
      errorDetails: {
        repository: repoPath,
        path,
        error: actualError,
      },
    };
  }
}
