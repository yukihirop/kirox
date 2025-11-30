import { input, confirm } from '@inquirer/prompts';
import { Octokit } from 'octokit';
import chalk from 'chalk';
import type { ParsedArguments } from './types.js';
import { validateProjectName } from './validator.js';
import { parseProjects } from './project-name-parser.js';
import { PinoLogger } from '../reporting/pino-logger.js';
import type { KiroxConfig } from '../config/types.js';
import type { Metadata } from '../tracking/types.js';
import {
  suggestProjects,
  promptMultipleProjectsWithValidation,
  formatMultipleProjectsToString,
} from './project-suggester.js';
import { parseRepositoryPath, fetchBranches, fetchDefaultBranch } from '../github/fetcher.js';
import { scanProjectsAcrossSubdirs } from '../github/tree-based-project-scanner.js';
import { promptProjectSelection } from './searchable-project-prompt.js';
import { promptBranch } from './branch-prompt.js';
import { scanDirectoriesAcrossRepo } from '../github/tree-based-dir-scanner.js';
import { promptSubdirSelection } from './searchable-subdir-prompt.js';

import { promptRepository } from './prompts/repository-prompt.js';

export { promptRepository };

export function shouldEnterInteractiveMode(args: ParsedArguments): boolean {
  
  if (!process.stdin.isTTY) {
    return false;
  }

  if (args.checkUpdates || args.update) {
    return false;
  }

  const hasRepository = args.repository && args.repository.trim() !== '';
  const hasProject =
    args.projects &&
    args.projects.length > 0 &&
    args.projects.some(p => p && p.trim() !== '');

  return !hasRepository || !hasProject;
}

export async function promptProject(
  currentValue: string,
  repository?: string,
  subdir?: string,
  client?: Octokit | undefined,
  logger?: PinoLogger,
  verbose?: boolean
): Promise<string> {
  
  if (currentValue && currentValue.trim() !== '') {
    return currentValue;
  }

  const canSuggest = repository && client && logger;

  if (canSuggest) {
    try {
      
      const repositoryRef = parseRepositoryPath(repository);

      const suggestionResult = await suggestProjects({
        repository: repositoryRef,
        subdir,
        client,
        logger,
        verbose: verbose || false,
      });

      if (suggestionResult.success && suggestionResult.projects.length > 0) {
        
        const selectedProjects = await promptMultipleProjectsWithValidation(suggestionResult.projects);

        if (selectedProjects.length === 1) {
          return selectedProjects[0]!;
        }

        return formatMultipleProjectsToString(selectedProjects);
      }

      if (suggestionResult.errorMessage) {
        console.error(chalk.red(`\n✗ ${suggestionResult.errorMessage}`));

        if (suggestionResult.errorDetails) {
          const { repository, path, error } = suggestionResult.errorDetails;
          console.error(chalk.gray(`\nRepository: ${repository}`));
          console.error(chalk.gray(`Path: ${path}`));
          console.error(chalk.gray(`Error: ${error}`));
          console.error(chalk.yellow('\nPlease check:'));
          console.error(chalk.dim('  - The subdirectory path is correct'));
          console.error(chalk.dim('  - The .kiro/specs/ directory exists in the specified path'));
          console.error(chalk.dim('  - You have access to the repository (set GITHUB_TOKEN if private)'));
          console.error('');
        }
      }

    } catch (_error) {
      
    }
  }

  return await input({
    message: chalk.bold.cyan('📋 Enter project name') +
      chalk.dim(' (comma-separated for multiple projects)'),
    validate: (value: string) => {
      const errors = validateProjectName(value);
      if (errors.length > 0) {
        
        return chalk.red(errors[0]?.message || 'Invalid project name');
      }
      return true;
    },
  });
}

export async function promptOutput(configFile?: KiroxConfig): Promise<string> {
  const defaultValue = configFile?.outputDirectory || '.';
  return await input({
    message: chalk.bold.cyan('📂 Enter output directory') +
      chalk.dim(` (default: ${defaultValue})`),
    default: defaultValue,
  });
}

export async function promptSubdir(configFile?: KiroxConfig): Promise<string | undefined> {
  const defaultValue = configFile?.subdir || '';
  const value = await input({
    message: chalk.bold.cyan('📁 Enter subdirectory in GitHub repository') +
      chalk.dim(' (optional)') +
      (defaultValue ? chalk.dim(` (default: ${defaultValue})`) : ''),
    default: defaultValue,
  });

  if (!value || value.trim() === '') {
    return undefined;
  }

  return value;
}

export async function confirmExecution(args: ParsedArguments): Promise<boolean> {
  
  console.log('\n' + chalk.bold.blue('Configuration:'));

  console.log(chalk.cyan('  Repository: ') + chalk.green(args.repository));

  if (args.steering) {
    console.log(chalk.cyan('  Mode: ') + chalk.yellow('Steering only'));
  } else {
    console.log(chalk.cyan('  Project: ') + chalk.green(args.projects.join(', ')));
  }

  console.log(chalk.cyan('  Output: ') + chalk.green(args.output));

  if (args.subdir) {
    console.log(chalk.cyan('  Subdirectory: ') + chalk.green(args.subdir));
  }

  return await confirm({
    message: chalk.bold.yellow('🚀 Execute with this configuration?'),
    default: false,
  });
}

export async function promptMissingArguments(
  args: ParsedArguments,
  configFile?: KiroxConfig,
  logger?: PinoLogger,
  verbose?: boolean,
  metadata?: Metadata
): Promise<ParsedArguments> {
  
  const completedArgs = { ...args };

  completedArgs.repository = await promptRepository(completedArgs.repository, metadata);

  let client: Octokit | undefined;
  if (logger) {
    try {
      client = new Octokit({
        auth: process.env.GITHUB_TOKEN,
      });
    } catch (error) {
      
      logger.debug('Failed to initialize GitHub client for project suggestion', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  if (!completedArgs.repository.includes('#') && logger && client && process.stdin.isTTY) {
    try {
      const repositoryRef = parseRepositoryPath(completedArgs.repository);

      let defaultBranch: string | undefined;
      try {
        defaultBranch = await fetchDefaultBranch(client, repositoryRef.owner, repositoryRef.repo);
        logger.debug('Default branch detected', { defaultBranch });
      } catch (error) {
        
        logger.debug('Failed to fetch default branch', {
          error: error instanceof Error ? error.message : String(error),
        });
      }

      try {
        console.log(chalk.cyan('\nFetching branches...'));
        const branches = await fetchBranches(client, repositoryRef.owner, repositoryRef.repo);

        if (branches.length > 0) {
          logger.debug('Fetched branches', { count: branches.length });
        }

        if (branches.length === 0) {
          console.error(chalk.red('No branches found in repository'));
          
        } else {
          
          const selectedBranch = await promptBranch(branches, defaultBranch);

          const branchToUse = selectedBranch || defaultBranch;
          if (branchToUse) {
            completedArgs.repository = `${completedArgs.repository}#${branchToUse}`;
            logger.debug('Branch selected', { branch: branchToUse });
          }
        }
      } catch (error) {
        
        logger.debug('Failed to fetch branches', {
          error: error instanceof Error ? error.message : String(error),
        });
        console.error(chalk.red('\n✗ Failed to fetch branches. Continuing with default branch...'));

        if (defaultBranch) {
          completedArgs.repository = `${completedArgs.repository}#${defaultBranch}`;
        }
      }
    } catch (error) {
      
      if (logger) {
        logger.debug('Unexpected error in branch selection', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  let treeApiSuccess = false;
  const shouldAttemptTreeAPI =
    logger &&
    client &&
    (!completedArgs.projects || completedArgs.projects.length === 0) &&
    !completedArgs.subdir && 
    !completedArgs.steering && 
    process.stdin.isTTY !== false; 

  if (shouldAttemptTreeAPI && client) {
    try {
      
      console.log(chalk.cyan('\nScanning repository for projects...'));

      const repositoryRef = parseRepositoryPath(completedArgs.repository);

      const scanResult = await scanProjectsAcrossSubdirs({
        repository: repositoryRef,
        client, 
        logger,
        verbose: verbose || false,
      });

      if (scanResult.success && scanResult.projects.length > 0) {
        
        const subdirCount = new Set(scanResult.projects.map(p => p.subdir)).size;
        console.log(chalk.green(`Found ${scanResult.projects.length} projects across ${subdirCount} subdirectories\n`));

        if (scanResult.truncated) {
          console.log(chalk.yellow('⚠️  Large repository: Some projects may not be displayed'));
          console.log(chalk.dim('   (GitHub API response was truncated)\n'));
        }

        const selectionResult = await promptProjectSelection(scanResult.projects);

        completedArgs.projects = selectionResult.projects;
        completedArgs.subdir = selectionResult.subdir;

        treeApiSuccess = true;
      }
    } catch (error) {
      
      if (logger) {
        logger.debug('Tree API search failed, falling back to existing workflow', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  let steeringSubdirSuccess = false;

  const shouldAttemptSteeringSubdirScan =
    completedArgs.steering && 
    !completedArgs.subdir && 
    logger &&
    client;

  if (shouldAttemptSteeringSubdirScan && client) {
    try {
      
      console.log(chalk.cyan('\nScanning repository for subdirectories...'));

      const repositoryRef = parseRepositoryPath(completedArgs.repository);

      const scanResult = await scanDirectoriesAcrossRepo({
        repository: repositoryRef,
        client,
        logger,
        verbose: verbose || false,
      });

      if (scanResult.success) {
        
        if (scanResult.truncated) {
          console.log(chalk.yellow('⚠️  Large repository: Some directories may not be shown'));
          console.log(chalk.dim('   (GitHub API response was truncated)\n'));
        }

        const selectionResult = await promptSubdirSelection(scanResult.directories);

        completedArgs.subdir = selectionResult.subdir;

        steeringSubdirSuccess = true;
      } else {
        
        if (scanResult.errorMessage) {
          console.error(chalk.red(`\n✗ ${scanResult.errorMessage}`));
          console.error(chalk.yellow('Falling back to text input...\n'));
        }
        
      }
    } catch (error) {
      
      if (logger) {
        logger.debug('Tree API subdirectory scan failed, falling back to text input', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
      
    }
  }

  if (!steeringSubdirSuccess && !treeApiSuccess && !completedArgs.subdir) {
    const subdir = await promptSubdir(configFile); 
    if (subdir) {
      completedArgs.subdir = subdir; 
    }
    
  }

  if (
    !treeApiSuccess &&
    !completedArgs.steering && 
    (!completedArgs.projects || completedArgs.projects.length === 0)
  ) {
    const projectString = await promptProject(
      completedArgs.projects.join(', '),
      completedArgs.repository,
      completedArgs.subdir, 
      client,
      logger,
      verbose
    );
    completedArgs.projects = parseProjects(projectString);
  }

  if (!completedArgs.output || completedArgs.output === '.') {
    completedArgs.output = await promptOutput(configFile);
  }

  const confirmed = await confirmExecution(completedArgs);
  if (!confirmed) {
    throw new Error('Operation cancelled');
  }

  return completedArgs;
}

interface InteractiveErrorResult {
  exitCode: number;
  shouldExit: boolean;
}

interface TTYCheckResult {
  success: boolean;
  exitCode: number;
}

export function checkTTYEnvironment(logger: PinoLogger): TTYCheckResult {
  
  if (!process.stdin.isTTY) {
    
    console.error(chalk.red('Interactive mode is only available in TTY environment. Please specify arguments explicitly.'));

    console.log(chalk.dim('Usage: npx kirox owner/repo -p project-name'));

    logger.error('Interactive mode requires TTY environment', {
      isTTY: process.stdin.isTTY,
      stdin: 'not a TTY',
    });

    return {
      success: false,
      exitCode: 1,
    };
  }

  return {
    success: true,
    exitCode: 0,
  };
}

export function handleInteractiveError(
  error: unknown,
  logger: PinoLogger
): InteractiveErrorResult {
  if (error instanceof Error) {
    
    if (error.name === 'ExitPromptError') {
      console.log(chalk.yellow('\nOperation cancelled'));
      logger.info('User cancelled interactive mode', {
        reason: 'Ctrl+C',
        errorName: error.name,
      });
      return {
        exitCode: 130, 
        shouldExit: true,
      };
    }

    if (error.message === 'Operation cancelled') {
      console.log(chalk.yellow('Operation cancelled'));
      logger.info('User cancelled execution at confirmation', {
        reason: 'Declined confirmation',
      });
      return {
        exitCode: 0, 
        shouldExit: true,
      };
    }

    console.log(chalk.red(`Error occurred: ${error.message}`));
    logger.error('Interactive mode error', {
      message: error.message,
      stack: error.stack,
    });
    return {
      exitCode: 1,
      shouldExit: true,
    };
  }

  console.log(chalk.red('Error occurred'));
  logger.error('Interactive mode error', {
    error: String(error),
  });
  return {
    exitCode: 1,
    shouldExit: true,
  };
}
