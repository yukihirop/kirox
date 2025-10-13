/**
 * Add Command Entry Point
 *
 * Main execution logic for the 'add' subcommand
 * Task 2.1: executeAddCommand function basic structure
 */

import path from 'path';
import { Octokit } from 'octokit';
import { parseArguments } from './parser.js';
import { validateInput } from './validator.js';
import { Logger } from '../reporting/logger.js';
import { ErrorHandler } from '../reporting/error-handler.js';
import { ProgressReporter } from '../reporting/progress-reporter.js';
import { loadConfig } from '../config/loader.js';
import { mergeConfig } from '../config/merger.js';
import { loadMetadata } from '../tracking/metadata-manager.js';
import { MetadataError, MetadataErrorType } from '../tracking/types.js';
import { parseRepositoryPath, fetchDirectoryContents } from '../github/fetcher.js';
import { buildRemotePath } from '../filesystem/path-utils.js';
import type { ExecutionResult } from './types.js';
import type { Metadata, ProjectMetadata } from '../tracking/types.js';
import type { ContentItem } from '../github/fetcher.js';

/**
 * Get metadata file path based on output directory
 *
 * @param outputDir - Output directory from args
 * @returns Metadata file path
 */
function getMetadataPath(outputDir: string): string {
  return path.join(outputDir, '.kiro', '.kirox-meta.json');
}

/**
 * Check if a project with the same repository, projectName, and subdir exists in metadata
 *
 * Task 2.3: Duplicate project detection
 * - Same repository + projectName + subdir = duplicate
 * - Different subdir = separate project
 *
 * @param metadata - Existing metadata
 * @param repository - Repository to check
 * @param projectName - Project name to check
 * @param subdir - Optional subdirectory to check
 * @returns True if duplicate exists, false otherwise
 */
function isDuplicateProject(
  metadata: Metadata,
  repository: string,
  projectName: string,
  subdir?: string
): boolean {
  return metadata.projects.some(
    (project) =>
      project.repository === repository &&
      project.projectName === projectName &&
      project.subdir === subdir
  );
}

/**
 * Execute add command with provided arguments
 *
 * Orchestrates the complete flow for adding new projects to existing metadata:
 * 1. Parse arguments
 * 2. Initialize Logger, ErrorHandler, ProgressReporter
 * 3. Load and merge configuration
 * 4. Validate input
 * 5. Check metadata existence (Task 2.2 - implemented)
 * 6. Detect duplicate projects (Task 2.3 - implemented)
 * 7. Fetch files from GitHub (Task 3.1, 3.2 - to be implemented)
 * 8. Write files to local filesystem (Task 4.1, 4.2 - to be implemented)
 * 9. Update metadata (Task 5.1, 5.2 - to be implemented)
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
  // Step 1: Initialize reporting components
  // These are needed for logging and error handling throughout the execution
  const logger = new Logger();
  const errorHandler = new ErrorHandler();

  try {
    // Step 2: Parse arguments
    // Convert command-line arguments into structured ParsedArguments object
    const args = parseArguments(argv);

    // Step 3: Initialize progress reporter
    // ProgressReporter handles user-facing progress messages and summaries
    const reporter = new ProgressReporter({
      verbose: args.verbose,
      useColor: true,
    });

    // Step 4: Load and merge configuration
    // Load config file (if specified) and merge with CLI arguments
    // CLI arguments take precedence over file config
    const fileConfig = await loadConfig(args.config);
    const mergedConfig = mergeConfig(args, fileConfig);

    // Log execution start if verbose mode is enabled
    if (args.verbose) {
      logger.info('Executing add command', {
        repository: mergedConfig.repository,
        projects: mergedConfig.projects,
        config: args.config || 'default',
      });
    }

    // Step 5: Validate input
    // Check that repository and project names are valid
    // This catches user errors before expensive API calls
    const validation = validateInput(mergedConfig);
    if (!validation.valid) {
      logger.error('Validation failed', { errors: validation.errors });

      return {
        success: false,
        filesDownloaded: 0,
        filesFailed: 0,
        exitCode: 1, // User error
      };
    }

    // Step 6: Check metadata existence (Task 2.2)
    // Verify .kirox-meta.json exists before proceeding
    // The add command requires existing metadata to add projects to
    // This check happens early to provide fast feedback to the user
    const metadataPath = getMetadataPath(mergedConfig.output);

    let metadata: Metadata;
    try {
      // Attempt to load existing metadata
      // This will throw MetadataError.NOT_FOUND if file doesn't exist
      metadata = await loadMetadata(metadataPath);

      if (args.verbose) {
        logger.info('Metadata file found', { path: metadataPath });
      }
    } catch (error) {
      // Handle metadata not found error specifically
      // This is a user error - they must run regular fetch first
      if (error instanceof MetadataError && error.type === MetadataErrorType.NOT_FOUND) {
        logger.error('Metadata file not found. Please run regular fetch command first.', {
          path: metadataPath,
          suggestion: 'Run: npx kirox <owner/repo> -p <project> --track',
        });

        return {
          success: false,
          filesDownloaded: 0,
          filesFailed: 0,
          exitCode: 1, // User error - metadata file required
        };
      }

      // Re-throw other metadata errors (e.g., INVALID_FORMAT, INVALID_SCHEMA)
      // These will be caught by the outer catch block and handled generically
      throw error;
    }

    // Step 7: Detect duplicate projects (Task 2.3)
    // Check if project already exists in metadata
    // Handle based on --force option:
    // - Without --force: Warn user and skip to prevent accidental overwrites
    // - With --force: Log verbose message and continue to overwrite
    //
    // A project is considered duplicate if repository + projectName + subdir all match.
    // Different subdir values create separate projects, even with the same repo + name.
    for (const projectName of mergedConfig.projects) {
      const isDuplicate = isDuplicateProject(
        metadata,
        mergedConfig.repository,
        projectName,
        mergedConfig.subdir
      );

      if (isDuplicate) {
        if (!mergedConfig.force) {
          // Without --force: warn and skip
          // This is a user error - they likely didn't intend to overwrite
          logger.warn('Project already exists. Use --force to overwrite.', {
            repository: mergedConfig.repository,
            projectName,
            subdir: mergedConfig.subdir,
          });

          return {
            success: false,
            filesDownloaded: 0,
            filesFailed: 0,
            exitCode: 1, // User error - duplicate project without --force
          };
        } else {
          // With --force: log verbose message and continue
          // User explicitly requested overwrite, so we proceed
          if (args.verbose) {
            logger.info('Overwriting existing project with --force option', {
              repository: mergedConfig.repository,
              projectName,
              subdir: mergedConfig.subdir,
            });
          }
        }
      }
    }

    // Step 8: Parse repository and determine effective branch (Task 3.1)
    // Extract owner, repo, and optional branch from repository path
    // CLI branch (in repository#branch format) takes precedence over config file branch
    const { owner, repo, branch } = parseRepositoryPath(mergedConfig.repository);
    const effectiveBranch = branch || mergedConfig.branch;

    if (args.verbose) {
      logger.info('Repository parsed', {
        owner,
        repo,
        branch: effectiveBranch || 'default',
      });
    }

    // Step 9: Initialize Octokit client for GitHub API
    const octokit = new Octokit({
      auth: process.env.GITHUB_TOKEN,
    });

    // Step 10: Prepare for GitHub file fetching (Task 3.1)
    // Extract subdirectory from merged config (defaults to empty string)
    const subdir = mergedConfig.subdir || '';

    if (args.verbose && subdir) {
      logger.info('Using subdirectory', { subdir });
    }

    // Track steering directory fetch status to avoid duplication across multiple projects
    // Task 3.1 Requirement 4.4: Steering files should only be fetched once
    let steeringFetched = false;
    const projects = mergedConfig.projects.length > 0 ? mergedConfig.projects : [''];

    for (const [index, projectName] of projects.entries()) {
      const isFirstProject = index === 0;

      try {
        // Step 10.1: Fetch directory listings for current project
        logger.info('Fetching directory listings from GitHub', {
          repository: mergedConfig.repository,
          project: projectName,
          ...(effectiveBranch && { branch: effectiveBranch }),
        });

        const specPath = buildRemotePath(subdir, projectName, 'specs');

        // Fetch spec directory (required)
        const specContents = await fetchDirectoryContents(
          octokit,
          owner,
          repo,
          specPath,
          effectiveBranch
        );

        // Fetch steering directory only for first project (to avoid duplication)
        // Task 3.1 Requirement 4.4: Avoid steering file duplication
        let steeringContents: ContentItem[] = [];
        if (isFirstProject && !steeringFetched) {
          const steeringPath = buildRemotePath(subdir, '', 'steering');
          try {
            steeringContents = await fetchDirectoryContents(
              octokit,
              owner,
              repo,
              steeringPath,
              effectiveBranch
            );
            steeringFetched = true; // Mark as fetched
          } catch (error) {
            // Steering directory is optional - log warning if verbose but continue
            if (args.verbose) {
              logger.warn('Steering directory not found, skipping', {
                path: steeringPath,
                error: error instanceof Error ? error.message : String(error),
              });
            }
          }
        }

        // Collect all file items
        const specFiles = specContents.filter((item) => item.type === 'file');
        const steeringFiles = steeringContents.filter((item) => item.type === 'file');
        const allFiles: ContentItem[] = [...specFiles, ...steeringFiles];

        if (args.verbose) {
          logger.info('Directory listings fetched', {
            specFiles: specFiles.length,
            steeringFiles: steeringFiles.length,
            total: allFiles.length,
            ...(subdir && { subdir }),
          });
        }

        // TODO: Step 11: Fetch file contents in parallel (Task 3.2)

        // TODO: Step 12: Write files to local filesystem (Task 4.1, 4.2)

        // TODO: Step 13: Update metadata (Task 5.1, 5.2)
      } catch (error) {
        // Handle project-specific errors
        const errorResult = errorHandler.handle(error, {
          project: projectName,
          details: error instanceof Error ? error.message : String(error),
        });
        logger.logError(errorResult);

        // For now, return failure on first error (will handle partial success in later tasks)
        return {
          success: false,
          filesDownloaded: 0,
          filesFailed: 0,
          exitCode: errorResult.exitCode,
        };
      }
    }

    // Temporary success return for Task 3.1 completion
    // This will be replaced with actual file fetching and writing in subsequent tasks
    return {
      success: true,
      filesDownloaded: 0,
      filesFailed: 0,
      exitCode: 0,
    };
  } catch (error) {
    // Handle unexpected errors
    // This catches any errors not handled by specific try-catch blocks
    const errorResult = errorHandler.handle(error);

    // Log error with details for debugging
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
  }
}
