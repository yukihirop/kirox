/**
 * Interactive Prompt Service
 *
 * Provides interactive prompts for missing CLI arguments
 * Task 3.1: 対話モード起動条件の実装
 * Task 4.1: リポジトリ入力プロンプトの実装
 * Task 4.2: プロジェクト名入力プロンプトの実装
 * Task 4.3: オプションパラメータ入力プロンプトの実装
 * Task 4.4: 確認プロンプトの実装
 * Task 7.1: 設定ファイルとの統合
 */

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
// Task 3.5: Import and re-export promptRepository from new prompts module
import { promptRepository } from './prompts/repository-prompt.js';

export { promptRepository };

/**
 * Determine if interactive mode should be entered
 *
 * Interactive mode is triggered when:
 * 1. Repository or project name is missing
 * 2. Running in a TTY environment (process.stdin.isTTY is true)
 * 3. NOT using --check-updates or --update options
 *
 * @param args - Parsed command-line arguments
 * @returns true if interactive mode should be entered
 */
export function shouldEnterInteractiveMode(args: ParsedArguments): boolean {
  // Check if running in TTY environment
  if (!process.stdin.isTTY) {
    return false;
  }

  // Skip interactive mode for --check-updates and --update options
  // These options don't require repository/project arguments
  if (args.checkUpdates || args.update) {
    return false;
  }

  // Check if repository or project is missing
  const hasRepository = args.repository && args.repository.trim() !== '';
  const hasProject =
    args.projects &&
    args.projects.length > 0 &&
    args.projects.some(p => p && p.trim() !== '');

  // Enter interactive mode if either is missing
  return !hasRepository || !hasProject;
}

/**
 * Prompt for project name input (extended with suggestion feature)
 *
 * Enhanced version that attempts to suggest projects from GitHub API.
 * Falls back to manual input on API failure or when dependencies are missing.
 *
 * Task 4.1: promptProject関数にサジェスト機能を統合
 *
 * @param currentValue - Current project name value (may be empty or whitespace)
 * @param repository - Repository reference (for suggestion feature)
 * @param subdir - Optional subdirectory path (for suggestion feature)
 * @param client - GitHub client instance (for suggestion feature)
 * @param logger - Logger instance (for suggestion feature)
 * @param verbose - Enable verbose logging (for suggestion feature)
 * @returns Validated project name string (single or comma-separated multiple)
 */
export async function promptProject(
  currentValue: string,
  repository?: string,
  subdir?: string,
  client?: Octokit | undefined,
  logger?: PinoLogger,
  verbose?: boolean
): Promise<string> {
  // Skip prompt if value is already provided (non-empty after trim)
  // Requirement 5.1: 既存の動作維持
  if (currentValue && currentValue.trim() !== '') {
    return currentValue;
  }

  // Check preconditions for suggestion feature
  // Requirement 5.2: 依存注入パラメータのチェック
  const canSuggest = repository && client && logger;

  if (canSuggest) {
    try {
      // Parse repository string to RepositoryRef
      const repositoryRef = parseRepositoryPath(repository);

      // Attempt to suggest projects from GitHub
      const suggestionResult = await suggestProjects({
        repository: repositoryRef,
        subdir,
        client,
        logger,
        verbose: verbose || false,
      });

      // Requirement 5.3 & Task 4.4: サジェスト成功時にプロンプトUIを表示（簡略化）
      if (suggestionResult.success && suggestionResult.projects.length > 0) {
        // Display checkbox UI for project selection (single or multiple)
        const selectedProjects = await promptMultipleProjectsWithValidation(suggestionResult.projects);

        // If single project selected, return project name string
        // Note: promptMultipleProjectsWithValidation guarantees at least one project is selected
        if (selectedProjects.length === 1) {
          return selectedProjects[0]!;
        }

        // If multiple projects selected, format as comma-separated string
        return formatMultipleProjectsToString(selectedProjects);
      }

      // Requirement 5.4: サジェスト失敗時のフォールバック
      // Display error message if available (in red for visibility)
      if (suggestionResult.errorMessage) {
        console.error(chalk.red(`\n✗ ${suggestionResult.errorMessage}`));

        // Display detailed error information if available
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

      // Fall through to manual input mode
    } catch (_error) {
      // Exception occurred during suggestion, fall through to manual input
      // Requirement 5.4: 例外時のフォールバック
    }
  }

  // Manual input mode (fallback or when preconditions not met)
  // Display interactive prompt with validation
  return await input({
    message: chalk.bold.cyan('📋 Enter project name') +
      chalk.dim(' (comma-separated for multiple projects)'),
    validate: (value: string) => {
      const errors = validateProjectName(value);
      if (errors.length > 0) {
        // Return first error message, or fallback message if array is somehow empty
        return chalk.red(errors[0]?.message || 'Invalid project name');
      }
      return true;
    },
  });
}

/**
 * Prompt for output directory
 *
 * Displays an interactive prompt with default value from config file or ".".
 * User can press Enter to accept default or specify a custom path.
 *
 * @param configFile - Configuration file values for default
 * @returns Output directory path (defaults to config file or ".")
 */
export async function promptOutput(configFile?: KiroxConfig): Promise<string> {
  const defaultValue = configFile?.outputDirectory || '.';
  return await input({
    message: chalk.bold.cyan('📂 Enter output directory') +
      chalk.dim(` (default: ${defaultValue})`),
    default: defaultValue,
  });
}

/**
 * Prompt for subdirectory path (optional)
 *
 * Displays an interactive prompt for optional subdirectory path.
 * If user provides an empty string or whitespace only, returns undefined.
 * Uses config file default if available.
 *
 * @param configFile - Configuration file values for default
 * @returns Subdirectory path, or undefined if empty
 */
export async function promptSubdir(configFile?: KiroxConfig): Promise<string | undefined> {
  const defaultValue = configFile?.subdir || '';
  const value = await input({
    message: chalk.bold.cyan('📁 Enter subdirectory in GitHub repository') +
      chalk.dim(' (optional)') +
      (defaultValue ? chalk.dim(` (default: ${defaultValue})`) : ''),
    default: defaultValue,
  });

  // Return undefined if empty or whitespace only
  if (!value || value.trim() === '') {
    return undefined;
  }

  return value;
}

/**
 * Display execution summary and confirm execution
 *
 * Shows a summary of the configuration (repository, project, output, subdir)
 * and prompts user to confirm execution.
 *
 * Task 3.4: In --steering mode, display "Mode: Steering only" instead of project names
 *
 * @param args - Parsed command-line arguments
 * @returns true if user confirms, false otherwise
 */
export async function confirmExecution(args: ParsedArguments): Promise<boolean> {
  // Display summary header
  console.log('\n' + chalk.bold.blue('Configuration:'));

  // Display repository
  console.log(chalk.cyan('  Repository: ') + chalk.green(args.repository));

  // Task 3.4: Display "Mode: Steering only" in steering mode, or project names in normal mode
  // Requirement 5.2: Display "Mode: Steering only" in steering mode
  // Requirement 5.3: Display project names in normal mode (backward compatibility)
  if (args.steering) {
    console.log(chalk.cyan('  Mode: ') + chalk.yellow('Steering only'));
  } else {
    console.log(chalk.cyan('  Project: ') + chalk.green(args.projects.join(', ')));
  }

  // Display output directory
  console.log(chalk.cyan('  Output: ') + chalk.green(args.output));

  // Display subdirectory if specified
  // Requirement 5.1: Display subdirectory if specified (both steering and normal mode)
  if (args.subdir) {
    console.log(chalk.cyan('  Subdirectory: ') + chalk.green(args.subdir));
  }

  // Show confirmation prompt with default: false
  return await confirm({
    message: chalk.bold.yellow('🚀 Execute with this configuration?'),
    default: false,
  });
}

/**
 * Prompt for missing arguments and complete the parsed arguments
 *
 * This function orchestrates all interactive prompts in sequence:
 * 1. Repository (if missing)
 * 2. Tree API search (Task 4.1) - if Logger provided and projects missing
 * 3. Subdirectory (if Tree API failed/skipped, optional) - Task 5.3: Moved before project
 * 4. Project (if missing) - with project suggestion feature (uses subdir from step 2/3)
 * 5. Output directory (if not specified or is default value)
 * 6. Confirmation (always prompt)
 *
 * Task 7.1: 設定ファイルからのデフォルト値読み込み
 * Task 4.2: promptProject関数呼び出し時に追加パラメータを渡す
 * Task 5.3: プロンプト実行順序の修正（subdirをprojectの前に移動）
 * Task 4.1: Tree API検索の統合とフォールバック分岐の実装
 * Task 7.2: メタデータからのリポジトリ提案機能（addコマンド用）
 *
 * @param args - Partially parsed arguments (may have missing required fields)
 * @param configFile - Configuration file values for defaults
 * @param logger - Logger instance for suggestion feature (optional)
 * @param verbose - Enable verbose logging for suggestion feature (optional)
 * @param metadata - Optional metadata for repository suggestion (add command)
 * @returns Completed ParsedArguments with all required fields filled
 * @throws Error if user cancels the confirmation prompt
 */
export async function promptMissingArguments(
  args: ParsedArguments,
  configFile?: KiroxConfig,
  logger?: PinoLogger,
  verbose?: boolean,
  metadata?: Metadata
): Promise<ParsedArguments> {
  // Create a copy to avoid mutating the input
  const completedArgs = { ...args };

  // 1. Prompt for repository if missing
  // Task 7.2: Pass metadata to promptRepository for repository suggestion
  completedArgs.repository = await promptRepository(completedArgs.repository, metadata);

  // 2. Initialize GitHub client for project suggestion feature (if logger is provided)
  // This allows both Tree API search and promptProject to use GitHub API
  let client: Octokit | undefined;
  if (logger) {
    try {
      client = new Octokit({
        auth: process.env.GITHUB_TOKEN,
      });
    } catch (error) {
      // If Octokit initialization fails, continue without suggestion feature
      // Both Tree API and promptProject will fall back to manual input
      logger.debug('Failed to initialize GitHub client for project suggestion', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  // Task 3.1: Branch selection logic
  // 2.5. Branch selection prompt (before Tree API search)
  // Skip if:
  // - Repository already contains #branch (Requirement 5.1, 5.2)
  // - Logger/Client not available (Requirement 8.1)
  // - Projects already specified (Requirement 8.2) - will skip Tree API too
  // - Non-TTY environment (Requirement 8.3)
  if (!completedArgs.repository.includes('#') && logger && client && process.stdin.isTTY) {
    try {
      const repositoryRef = parseRepositoryPath(completedArgs.repository);

      // 2.5.1 Fetch default branch
      let defaultBranch: string | undefined;
      try {
        defaultBranch = await fetchDefaultBranch(client, repositoryRef.owner, repositoryRef.repo);
        logger.debug('Default branch detected', { defaultBranch });
      } catch (error) {
        // Log error but continue without default branch
        logger.debug('Failed to fetch default branch', {
          error: error instanceof Error ? error.message : String(error),
        });
      }

      // 2.5.2 Fetch branches
      try {
        console.log(chalk.cyan('\nFetching branches...'));
        const branches = await fetchBranches(client, repositoryRef.owner, repositoryRef.repo);

        // Task 3.3: Requirement 11.1, 11.2 - Log branch count
        if (branches.length > 0) {
          logger.debug('Fetched branches', { count: branches.length });
        }

        if (branches.length === 0) {
          console.error(chalk.red('No branches found in repository'));
          // Continue without branch selection
        } else {
          // 2.5.3 Prompt for branch selection
          const selectedBranch = await promptBranch(branches, defaultBranch);

          // 2.5.4 Append branch to repository string
          const branchToUse = selectedBranch || defaultBranch;
          if (branchToUse) {
            completedArgs.repository = `${completedArgs.repository}#${branchToUse}`;
            logger.debug('Branch selected', { branch: branchToUse });
          }
        }
      } catch (error) {
        // Log error and continue without branch selection
        logger.debug('Failed to fetch branches', {
          error: error instanceof Error ? error.message : String(error),
        });
        console.error(chalk.red('\n✗ Failed to fetch branches. Continuing with default branch...'));

        // Fallback to default branch if available
        if (defaultBranch) {
          completedArgs.repository = `${completedArgs.repository}#${defaultBranch}`;
        }
      }
    } catch (error) {
      // Catch-all for unexpected errors - continue without branch
      if (logger) {
        logger.debug('Unexpected error in branch selection', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  // 3. Task 4.1: Attempt Tree API search if logger and client are available
  // Task 4.3: Skip Tree API in the following cases (Requirements 6.1, 6.4):
  // - Logger is not provided (Requirement 3.1)
  // - Client initialization failed
  // - Projects are already specified
  // - Subdirectory is already specified (Requirement 6.1: non-interactive mode)
  // - Non-TTY environment (Requirement 6.4)
  // - Steering mode is enabled (Task 3.1: Requirement 3.3)
  let treeApiSuccess = false;
  const shouldAttemptTreeAPI =
    logger &&
    client &&
    (!completedArgs.projects || completedArgs.projects.length === 0) &&
    !completedArgs.subdir && // Skip if subdirectory already specified (Requirement 6.1)
    !completedArgs.steering && // Skip in --steering mode (Task 3.1: Requirement 3.3)
    process.stdin.isTTY !== false; // Skip in non-TTY environment (Requirement 6.4), treat undefined as TTY

  if (shouldAttemptTreeAPI && client) {
    try {
      // Display loading message (Requirement 7.1)
      console.log(chalk.cyan('\nScanning repository for projects...'));

      // Parse repository reference
      const repositoryRef = parseRepositoryPath(completedArgs.repository);

      // Call Tree API to scan projects across subdirectories
      const scanResult = await scanProjectsAcrossSubdirs({
        repository: repositoryRef,
        client, // Type guard: client is guaranteed to be defined here
        logger,
        verbose: verbose || false,
      });

      // Check if Tree API succeeded and found projects
      if (scanResult.success && scanResult.projects.length > 0) {
        // Display summary message (Requirement 7.3)
        const subdirCount = new Set(scanResult.projects.map(p => p.subdir)).size;
        console.log(chalk.green(`Found ${scanResult.projects.length} projects across ${subdirCount} subdirectories\n`));

        // Display truncated warning if applicable (Requirement 5.3)
        if (scanResult.truncated) {
          console.log(chalk.yellow('⚠️  Large repository: Some projects may not be displayed'));
          console.log(chalk.dim('   (GitHub API response was truncated)\n'));
        }

        // Prompt user to select project(s) using searchable UI
        const selectionResult = await promptProjectSelection(scanResult.projects);

        // Auto-extract project names and subdirectory (Requirement 3.3, 3.4)
        completedArgs.projects = selectionResult.projects;
        completedArgs.subdir = selectionResult.subdir;

        // Mark Tree API as successful to skip subdirectory prompt
        treeApiSuccess = true;
      }
    } catch (error) {
      // Tree API failed, fall through to existing workflow
      // Log error
      if (logger) {
        logger.debug('Tree API search failed, falling back to existing workflow', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  // 4. Task 9.3: --steering mode subdirectory selection with Tree API
  // In --steering mode, attempt Tree API scan for subdirectory selection UI
  // Requirements: 9.1, 9.7, 9.8, 9.9
  let steeringSubdirSuccess = false;

  // Task 9.3: Attempt Tree API subdirectory scan in --steering mode
  // Requirements 9.8, 9.9: Scan only when:
  // - --steering flag is enabled
  // - --subdir is not already specified (backward compatibility)
  // - Logger and client are available
  const shouldAttemptSteeringSubdirScan =
    completedArgs.steering && // --steering mode only
    !completedArgs.subdir && // Skip if subdirectory already specified
    logger &&
    client;

  if (shouldAttemptSteeringSubdirScan && client) {
    try {
      // Display loading message
      console.log(chalk.cyan('\nScanning repository for subdirectories...'));

      // Parse repository reference
      const repositoryRef = parseRepositoryPath(completedArgs.repository);

      // Call Tree API to scan directories across repository (Requirement 9.1)
      const scanResult = await scanDirectoriesAcrossRepo({
        repository: repositoryRef,
        client,
        logger,
        verbose: verbose || false,
      });

      // Check if Tree API succeeded (Requirement 9.7: Success path)
      if (scanResult.success) {
        // Display truncated warning if applicable
        if (scanResult.truncated) {
          console.log(chalk.yellow('⚠️  Large repository: Some directories may not be shown'));
          console.log(chalk.dim('   (GitHub API response was truncated)\n'));
        }

        // Prompt user to select subdirectory using searchable UI (Requirement 9.8)
        const selectionResult = await promptSubdirSelection(scanResult.directories);

        // Set subdirectory (empty string for root is valid)
        completedArgs.subdir = selectionResult.subdir;

        // Mark subdirectory selection as successful
        steeringSubdirSuccess = true;
      } else {
        // Requirement 9.7: Fallback on Tree API failure
        // Display error message if available
        if (scanResult.errorMessage) {
          console.error(chalk.red(`\n✗ ${scanResult.errorMessage}`));
          console.error(chalk.yellow('Falling back to text input...\n'));
        }
        // Fall through to text input prompt
      }
    } catch (error) {
      // Requirement 9.7: Exception handling
      // Log error
      if (logger) {
        logger.debug('Tree API subdirectory scan failed, falling back to text input', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
      // Fall through to text input prompt
    }
  }

  // 4b. Prompt for subdirectory if Tree API did not succeed (Requirement 3.2: Fallback)
  // Task 3.3: Subdirectory prompt display control (Requirement 4.1, 4.2, 4.3, 4.4)
  // In --steering mode, subdirectory prompt is displayed if not already specified
  // Skip if:
  // - Tree API succeeded (subdirectory already selected via UI in --steering mode)
  // - Project Tree API succeeded (subdirectory already auto-extracted in normal mode)
  // - Subdirectory is already specified (Requirement 4.4)
  if (!steeringSubdirSuccess && !treeApiSuccess && !completedArgs.subdir) {
    const subdir = await promptSubdir(configFile); // Requirement 4.1: Display prompt in steering mode
    if (subdir) {
      completedArgs.subdir = subdir; // Requirement 4.3: Set valid path
    }
    // Requirement 4.2: Empty string becomes undefined (handled by promptSubdir lines 256-258)
  }

  // 5. Prompt for project if missing (and Tree API did not provide it)
  // Task 3.2: Skip in --steering mode (Requirement 3.4)
  // Pass additional parameters for project suggestion feature
  // Convert projects array back to string for prompting, then parse result
  if (
    !treeApiSuccess &&
    !completedArgs.steering && // Skip in --steering mode (Task 3.2: Requirement 3.4)
    (!completedArgs.projects || completedArgs.projects.length === 0)
  ) {
    const projectString = await promptProject(
      completedArgs.projects.join(', '),
      completedArgs.repository,
      completedArgs.subdir, // Now this has the correct value from step 3 or 4
      client,
      logger,
      verbose
    );
    completedArgs.projects = parseProjects(projectString);
  }

  // 6. Prompt for output directory only if not already specified
  // Check if output is the default value or empty
  if (!completedArgs.output || completedArgs.output === '.') {
    completedArgs.output = await promptOutput(configFile);
  }

  // 7. Show confirmation prompt
  const confirmed = await confirmExecution(completedArgs);
  if (!confirmed) {
    throw new Error('Operation cancelled');
  }

  return completedArgs;
}

// Error handling result for interactive mode
// @internal Commented out - reserved for future use
interface InteractiveErrorResult {
  exitCode: number;
  shouldExit: boolean;
}

// TTY environment check result
// @internal Commented out - reserved for future use
interface TTYCheckResult {
  success: boolean;
  exitCode: number;
}

/**
 * Check if the current environment supports TTY (interactive terminal)
 *
 * This function verifies that the process is running in a TTY environment,
 * which is required for interactive prompts to work.
 *
 * Task 5.3: 非TTY環境エラーハンドリングの実装
 *
 * @param logger - Logger instance for recording events
 * @returns TTY check result with success flag and exit code
 */
export function checkTTYEnvironment(logger: PinoLogger): TTYCheckResult {
  // Check if stdin is a TTY (terminal)
  if (!process.stdin.isTTY) {
    // Display error message
    console.error(chalk.red('Interactive mode is only available in TTY environment. Please specify arguments explicitly.'));

    // Display usage example
    console.log(chalk.dim('Usage: npx kirox owner/repo -p project-name'));

    // Log the error
    logger.error('Interactive mode requires TTY environment', {
      isTTY: process.stdin.isTTY,
      stdin: 'not a TTY',
    });

    return {
      success: false,
      exitCode: 1,
    };
  }

  // TTY environment is available
  return {
    success: true,
    exitCode: 0,
  };
}

/**
 * Handle errors that occur during interactive mode
 *
 * This function handles three types of errors:
 * 1. ExitPromptError (Ctrl+C) - exitCode 130
 * 2. Confirmation cancellation ('Operation cancelled') - exitCode 0
 * 3. Other errors - exitCode 1
 *
 * Task 5.1: Ctrl+C中断処理の実装
 *
 * @param error - Error that occurred during interactive mode
 * @param logger - Logger instance for recording events
 * @returns Error handling result with exit code and exit flag
 */
export function handleInteractiveError(
  error: unknown,
  logger: PinoLogger
): InteractiveErrorResult {
  if (error instanceof Error) {
    // Case 1: ExitPromptError (Ctrl+C by user)
    if (error.name === 'ExitPromptError') {
      console.log(chalk.yellow('\nOperation cancelled'));
      logger.info('User cancelled interactive mode', {
        reason: 'Ctrl+C',
        errorName: error.name,
      });
      return {
        exitCode: 130, // Standard SIGINT exit code
        shouldExit: true,
      };
    }

    // Case 2: Confirmation cancellation ('Operation cancelled')
    if (error.message === 'Operation cancelled') {
      console.log(chalk.yellow('Operation cancelled'));
      logger.info('User cancelled execution at confirmation', {
        reason: 'Declined confirmation',
      });
      return {
        exitCode: 0, // User intentionally cancelled, not an error
        shouldExit: true,
      };
    }

    // Case 3: Other errors
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

  // Unknown error type
  console.log(chalk.red('Error occurred'));
  logger.error('Interactive mode error', {
    error: String(error),
  });
  return {
    exitCode: 1,
    shouldExit: true,
  };
}
