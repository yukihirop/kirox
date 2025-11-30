/**
 * Add Command Entry Point
 *
 * Task 5.2: Refactored executeAddCommand using helper functions
 * Main execution logic for the 'add' subcommand
 */

import { Octokit } from 'octokit';
import { parseArguments } from './parser.js';
import { validateInput } from './validator.js';
import { PinoLogger } from '../reporting/pino-logger.js';
import { ErrorHandler } from '../reporting/error-handler.js';
import { ProgressReporter } from '../reporting/progress-reporter.js';
import { parseRepositoryPath } from '../github/fetcher.js';
import { shouldEnterInteractiveMode, promptMissingArguments } from './interactive-prompt.js';
import {
  loadAndMergeConfig,
  checkMetadataAndDuplicates,
  fetchAndWriteFiles,
  updateMetadataAndReport,
} from './add-command-helpers.js';
import type { ExecutionResult } from './types.js';

/**
 * Execute add command with provided arguments
 *
 * Orchestrates the complete flow for adding new projects using helper functions:
 * 1. Parse arguments and initialize components
 * 2. Handle interactive mode if needed
 * 3. Load and merge configuration
 * 4. Check metadata and detect duplicates
 * 5. Fetch and write files for each project
 * 6. Update metadata and report results
 *
 * @param argv - Command-line arguments (e.g., ['node', 'kirox', 'add', 'owner/repo', '-p', 'project'])
 * @returns Execution result with success status and file counts
 *
 * @example
 * ```typescript
 * const result = await executeAddCommand(['node', 'kirox', 'add', 'owner/repo', '-p', 'new-project']);
 * console.log(`Success: ${result.success}, Files: ${result.filesDownloaded}`);
 * ```
 */
export async function executeAddCommand(argv: string[]): Promise<ExecutionResult> {
  // Step 1: Parse arguments and initialize components
  const args = parseArguments(argv);
  const logger = new PinoLogger(args.verbose);
  const errorHandler = new ErrorHandler();

  // Signal handling for Ctrl+C
  let interrupted = false;
  const handleInterrupt = () => {
    interrupted = true;
    console.log('\nOperation was interrupted.');
    process.exit(130);
  };

  process.on('SIGINT', handleInterrupt);
  process.on('SIGTERM', handleInterrupt);

  try {
    const reporter = new ProgressReporter({
      verbose: args.verbose,
      useColor: true,
    });

    // Step 2: Load configuration first (needed for interactive mode)
    let config = await loadAndMergeConfig(args, logger);

    // Step 3: Handle interactive mode if needed
    const enterInteractiveMode = shouldEnterInteractiveMode(args);

    if (enterInteractiveMode) {
      try {
        const completedArgs = await promptMissingArguments(
          args,
          config,
          logger,
          args.verbose,
          undefined
        );

        // Update args with completed values
        args.repository = completedArgs.repository;
        args.projects = completedArgs.projects;
        args.output = completedArgs.output;
        args.subdir = completedArgs.subdir;

        // Re-merge config after interactive mode (subdir may have changed)
        config = await loadAndMergeConfig(args, logger);

        if (args.verbose) {
          logger.info('Interactive prompts completed', {
            repository: args.repository,
            projects: args.projects,
            subdir: args.subdir,
          });
        }
      } catch (error) {
        if (error instanceof Error && error.message === 'Operation cancelled') {
          console.log('Operation cancelled');
          return {
            success: false,
            filesDownloaded: 0,
            filesFailed: 0,
            exitCode: 0,
          };
        }
        throw error;
      }
    }

    if (args.verbose) {
      logger.info('Executing add command', {
        repository: args.repository,
        projects: args.projects,
        config: args.config || 'default',
      });
    }

    // Step 4: Validate input
    const validation = validateInput(args);
    if (!validation.valid) {
      logger.error('Validation failed', { errors: validation.errors });
      return {
        success: false,
        filesDownloaded: 0,
        filesFailed: 0,
        exitCode: 1,
      };
    }

    // Step 5: Check metadata and detect duplicates
    let metadataCheck;
    try {
      metadataCheck = await checkMetadataAndDuplicates(args, config, logger);
    } catch (_error) {
      // Duplicate project error
      return {
        success: false,
        filesDownloaded: 0,
        filesFailed: 0,
        exitCode: 1,
      };
    }

    // Step 6: Parse repository
    const { owner, repo, branch } = parseRepositoryPath(args.repository);
    const effectiveBranch = branch || config.branch;

    if (args.verbose) {
      logger.info('Repository parsed', {
        owner,
        repo,
        branch: effectiveBranch || 'default',
      });
    }

    // Step 7: Initialize Octokit
    const octokit = new Octokit({
      auth: process.env.GITHUB_TOKEN,
    });

    const subdir = config.subdir || '';
    const projects = args.projects.length > 0 ? args.projects : [''];

    // Track results across all projects
    let totalFilesDownloaded = 0;
    let totalFilesFailed = 0;
    let successfulProjects = 0;
    let failedProjects = 0;
    const steeringFetched = { value: false };

    // Step 8: Process each project
    for (const [index, projectName] of projects.entries()) {
      const isFirstProject = index === 0;

      try {
        // Fetch and write files
        const fetchResult = await fetchAndWriteFiles(
          octokit,
          owner,
          repo,
          projectName,
          effectiveBranch,
          subdir,
          args,
          config,
          reporter,
          logger,
          isFirstProject,
          steeringFetched
        );

        // Check for interruption before metadata update
        if (interrupted) {
          continue;
        }

        // Update metadata and report
        await updateMetadataAndReport(
          projectName,
          fetchResult,
          args,
          config,
          metadataCheck,
          logger,
          reporter,
          projects.length
        );

        successfulProjects++;
        totalFilesDownloaded += fetchResult.success.length;
        totalFilesFailed += fetchResult.failed;
      } catch (error) {
        // Handle project-specific errors
        const errorResult = errorHandler.handle(error, {
          project: projectName,
          details: error instanceof Error ? error.message : String(error),
        });
        logger.logError(errorResult);

        failedProjects++;
      }
    }

    // Step 9: Display overall summary for multi-project operations
    if (projects.length > 1) {
      const totalProjects = successfulProjects + failedProjects;
      reporter.reportOverallSummary(totalProjects, totalFilesDownloaded, totalFilesFailed);
    }

    if (args.verbose) {
      logger.info('All projects processed', {
        successfulProjects,
        failedProjects,
        totalFilesDownloaded,
        totalFilesFailed,
      });
    }

    const hasAnySuccess = successfulProjects > 0;
    return {
      success: hasAnySuccess,
      filesDownloaded: totalFilesDownloaded,
      filesFailed: totalFilesFailed,
      exitCode: hasAnySuccess ? 0 : 1,
    };
  } catch (error) {
    // Handle unexpected errors
    const errorResult = errorHandler.handle(error);

    if (error instanceof Error) {
      logger.error('Unexpected error in add command', {
        message: error.message,
        stack: error.stack,
      });
    }

    logger.logError(errorResult);

    return {
      success: false,
      filesDownloaded: 0,
      filesFailed: 0,
      exitCode: errorResult.exitCode,
    };
  } finally {
    // Clean up signal handlers
    process.removeListener('SIGINT', handleInterrupt);
    process.removeListener('SIGTERM', handleInterrupt);
  }
}
