import type { Octokit } from 'octokit';
import { select, checkbox } from '@inquirer/prompts';
import { fetchDirectoryContents } from '@/github/fetcher.js';
import type { RepositoryRef } from '@/github/fetcher.js';
import { PinoLogger } from '@/reporting/pino-logger.js';

interface ProjectSuggestionResult {
  projects: string[];
  success: boolean;
  errorMessage?: string;
  errorDetails?: {
    repository: string;
    path: string;
    error: string;
  };
}

interface ProjectSuggestionOptions {
  repository: RepositoryRef;
  subdir?: string;
  client: Octokit;
  logger: PinoLogger;
  verbose: boolean;
}

export const MULTIPLE_SELECTION_MARKER = '__MULTIPLE__';

interface Choice {
  name: string;
  value: string;
}

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

export function formatSingleProjectToArray(projectName: string): string[] {
  if (projectName === '') {
    return [];
  }
  return [projectName];
}

function buildMultipleProjectChoices(projects: string[]): Choice[] {
  return projects.map((project) => ({
    name: project,
    value: project,
  }));
}

export async function promptMultipleProjects(projects: string[]): Promise<string[]> {
  const choices = buildMultipleProjectChoices(projects);

  const selected = await checkbox({
    message: '📋 Select projects (Space to select, Enter to confirm)',
    choices,
    pageSize: 10,
    loop: true,
  });

  return selected;
}

export async function promptMultipleProjectsWithValidation(
  projects: string[]
): Promise<string[]> {

  while (true) {
    const selected = await promptMultipleProjects(projects);

    if (selected.length === 0) {
      console.error('Please select at least one project');
      continue;
    }

    return selected;
  }
}

export function formatMultipleProjectsToString(projects: string[]): string {
  return projects.join(',');
}

function getErrorMessage(error: unknown): string {
  
  const defaultMessage = 'Failed to fetch project list from GitHub';

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

function showLoadingMessage(message: string): void {
  process.stdout.write(message);
}

function clearLoadingMessage(): void {
  process.stdout.write('\r\x1b[K');
}

export async function suggestProjects(
  options: ProjectSuggestionOptions
): Promise<ProjectSuggestionResult> {
  const { repository, subdir, client, logger } = options;

  const path = subdir ? `${subdir}/.kiro/specs` : '.kiro/specs';

  showLoadingMessage('Fetching available projects...');

  let waitMessageTimeout: NodeJS.Timeout | null = null;
  waitMessageTimeout = setTimeout(() => {
    clearLoadingMessage();
    showLoadingMessage('Fetching available projects... Please wait...');
  }, 3000);

  try {
    
    logger.debug('Fetching available projects from GitHub', {
      repository: `${repository.owner}/${repository.repo}`,
      branch: repository.branch || 'default',
      path,
    });

    const contents = await fetchDirectoryContents(
      client,
      repository.owner,
      repository.repo,
      path,
      repository.branch
    );

    if (waitMessageTimeout) {
      clearTimeout(waitMessageTimeout);
    }
    clearLoadingMessage();

    const projects = contents
      .filter((item) => item.type === 'dir')
      .map((item) => item.name);

    if (projects.length === 0) {
      const errorMessage = 'No projects found in .kiro/specs/';
      const repoPath = `${repository.owner}/${repository.repo}${repository.branch ? `#${repository.branch}` : ''}`;
      logger.debug(errorMessage, {
        repository: repoPath,
      });
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

    logger.debug('Successfully fetched projects', {
      count: projects.length,
      projects,
    });

    return { projects, success: true };
  } catch (error) {
    
    if (waitMessageTimeout) {
      clearTimeout(waitMessageTimeout);
    }
    clearLoadingMessage();

    const errorMessage = getErrorMessage(error);
    const repoPath = `${repository.owner}/${repository.repo}${repository.branch ? `#${repository.branch}` : ''}`;
    const actualError = error instanceof Error ? error.message : String(error);

    const errorObj = error as Error & { debugInfo?: unknown };
    logger.debug('Failed to fetch projects from GitHub', {
      error: actualError,
      repository: repoPath,
      path,
      
      debugInfo: errorObj.debugInfo,
      
      fullError: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack,
        ...(error as unknown as Record<string, unknown>),
      } : error,
    });

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
