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
import { loadMetadata, upsertProject } from '../tracking/metadata-manager.js';
import { MetadataError, MetadataErrorType } from '../tracking/types.js';
import { parseRepositoryPath, fetchDirectoryContents } from '../github/fetcher.js';
import { fetchFilesInParallel } from '../github/parallel-fetcher.js';
import { buildRemotePath, resolveOutputPath } from '../filesystem/path-utils.js';
import { writeFile } from '../filesystem/writer.js';
import { calculateFileHash } from '../tracking/hash-calculator.js';
import type { ExecutionResult } from './types.js';
import type { Metadata, ProjectMetadata, FileMetadata } from '../tracking/types.js';
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
    const config = mergeConfig(args, fileConfig);

    // Log execution start if verbose mode is enabled
    if (args.verbose) {
      logger.info('Executing add command', {
        repository: args.repository,
        projects: args.projects,
        config: args.config || 'default',
      });
    }

    // Step 5: Validate input
    // Check that repository and project names are valid
    // This catches user errors before expensive API calls
    const validation = validateInput(args);
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
    const metadataPath = getMetadataPath(args.output);

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
    for (const projectName of args.projects) {
      const isDuplicate = isDuplicateProject(
        metadata,
        args.repository,
        projectName,
        config.subdir
      );

      if (isDuplicate) {
        if (!config.force) {
          // Without --force: warn and skip
          // This is a user error - they likely didn't intend to overwrite
          logger.warn('Project already exists. Use --force to overwrite.', {
            repository: args.repository,
            projectName,
            subdir: config.subdir,
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
              repository: args.repository,
              projectName,
              subdir: config.subdir,
            });
          }
        }
      }
    }

    // Step 8: Parse repository and determine effective branch (Task 3.1)
    // Extract owner, repo, and optional branch from repository path
    // CLI branch (in repository#branch format) takes precedence over config file branch
    const { owner, repo, branch } = parseRepositoryPath(args.repository);
    const effectiveBranch = branch || config.branch;

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
    const subdir = config.subdir || '';

    if (args.verbose && subdir) {
      logger.info('Using subdirectory', { subdir });
    }

    // Track steering directory fetch status to avoid duplication across multiple projects
    // Task 3.1 Requirement 4.4: Steering files should only be fetched once
    let steeringFetched = false;
    const projects = args.projects.length > 0 ? args.projects : [''];

    for (const [index, projectName] of projects.entries()) {
      const isFirstProject = index === 0;

      try {
        // Step 10.1: Fetch directory listings for current project
        logger.info('Fetching directory listings from GitHub', {
          repository: args.repository,
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

        // Step 11: Fetch file contents in parallel (Task 3.2)
        // Extract file paths from ContentItem array
        const filePaths = allFiles.map((item) => item.path);

        if (args.verbose) {
          logger.info('Starting parallel file fetch', {
            fileCount: filePaths.length,
            maxConcurrency: 5,
          });
        }

        // Fetch all files in parallel with semaphore control
        // Task 3.2 Requirements:
        // - fetchFilesInParallel() with semaphore control (max 5 concurrent)
        // - Classify success/failed files
        // - Partial failure tolerance (Promise.allSettled)
        const fetchResult = await fetchFilesInParallel(
          octokit,
          owner,
          repo,
          filePaths,
          5, // maxConcurrency
          effectiveBranch
        );

        if (args.verbose) {
          logger.info('Parallel file fetch completed', {
            successCount: fetchResult.success.length,
            failedCount: fetchResult.failed.length,
          });
        }

        // Step 12: Write files to local filesystem (Task 4.1)
        // Iterate through successfully fetched files and write them to disk
        const writeOptions = {
          force: config.force,
          prompt: false, // No interactive prompts in add command (use --force)
          dryRun: config.dryRun,
          verbose: config.verbose,
        };

        if (args.verbose) {
          logger.info('Starting file writes', {
            fileCount: fetchResult.success.length,
            outputDir: args.output,
            dryRun: config.dryRun,
          });
        }

        // Track write results
        let filesWritten = 0;
        let filesSkipped = 0;
        const writeErrors: Array<{ path: string; error: string }> = [];

        // Calculate total file count for progress reporting
        const totalFiles = fetchResult.success.length;

        // Determine project name for multi-project progress display
        // Only include project name prefix if multiple projects are being processed
        const displayProjectName = projects.length > 1 ? projectName : undefined;

        for (const [fileIndex, file] of fetchResult.success.entries()) {
          const currentFileNumber = fileIndex + 1;

          try {
            // Task 4.2: Report progress before writing each file
            // Format: [1/5] file.md を取得中...
            // With project prefix for multi-project: [proj1] [1/5] file.md を取得中...
            reporter.reportProgress(
              currentFileNumber,
              totalFiles,
              file.path,
              displayProjectName
            );

            // Convert remote path to local path
            const localPath = resolveOutputPath(args.output, file.path);

            if (args.verbose) {
              logger.info('Writing file', {
                remotePath: file.path,
                localPath,
                size: file.size,
              });
            }

            // Write file to disk
            const writeResult = await writeFile(localPath, file.content, writeOptions);

            if (writeResult.written) {
              filesWritten++;

              // Task 4.2: Report success for written file
              reporter.reportSuccess(`Saved: ${file.path}`);
            } else if (writeResult.skipped) {
              filesSkipped++;
              if (args.verbose && writeResult.reason) {
                logger.info('File skipped', {
                  path: file.path,
                  reason: writeResult.reason,
                });
              }
            }
          } catch (error) {
            // Track write errors
            const errorMessage = error instanceof Error ? error.message : String(error);
            writeErrors.push({
              path: file.path,
              error: errorMessage,
            });

            // Task 4.2: Report error for failed write
            // Use logger.error (existing pattern) instead of reporter.reportError
            // to maintain consistency with current error handling
            logger.error('Failed to write file', {
              path: file.path,
              error: errorMessage,
            });
          }
        }

        if (args.verbose) {
          logger.info('File writes completed', {
            written: filesWritten,
            skipped: filesSkipped,
            failed: writeErrors.length,
          });
        }

        // If any write errors occurred, handle them
        if (writeErrors.length > 0) {
          const errorResult = errorHandler.handle(
            new Error(`Failed to write ${writeErrors.length} file(s)`),
            {
              project: projectName,
              details: `Write errors: ${writeErrors.map(e => e.path).join(', ')}`,
            }
          );
          logger.logError(errorResult);

          // Return failure with write error details
          return {
            success: false,
            filesDownloaded: fetchResult.success.length - writeErrors.length,
            filesFailed: fetchResult.failed.length + writeErrors.length,
            exitCode: errorResult.exitCode,
          };
        }

        // Step 13: Update metadata (Task 5.1)
        // Create FileMetadata array by calculating local hashes for written files
        const fileMetadataList: FileMetadata[] = [];
        const currentTimestamp = new Date().toISOString();

        for (const file of fetchResult.success) {
          const localPath = resolveOutputPath(args.output, file.path);

          try {
            // Calculate local hash for the written file
            const localHash = await calculateFileHash(localPath);

            // Create FileMetadata entry
            const fileMetadata: FileMetadata = {
              path: file.path,
              sha: file.sha,
              localHash,
              size: file.size,
              fetchedAt: currentTimestamp,
            };

            fileMetadataList.push(fileMetadata);

            if (args.verbose) {
              logger.info('Calculated file hash', {
                path: file.path,
                localHash: localHash.substring(0, 8) + '...',
              });
            }
          } catch (error) {
            // If hash calculation fails, log warning but continue
            // This shouldn't happen for files we just wrote, but handle gracefully
            const errorMessage = error instanceof Error ? error.message : String(error);
            logger.warn('Failed to calculate file hash', {
              path: file.path,
              error: errorMessage,
            });
          }
        }

        // Create ProjectMetadata
        const projectMetadata: ProjectMetadata = {
          repository: args.repository,
          projectName,
          ...(config.subdir && { subdir: config.subdir }),
          fetchedAt: currentTimestamp,
          files: fileMetadataList,
        };

        // Save ProjectMetadata to metadata file using upsertProject
        try {
          await upsertProject(projectMetadata, metadataPath);

          if (args.verbose) {
            logger.info('Metadata updated successfully', {
              project: projectName,
              fileCount: fileMetadataList.length,
            });
          }
        } catch (error) {
          // Metadata save failure is critical - return error
          const errorResult = errorHandler.handle(
            new Error('Failed to update metadata'),
            {
              project: projectName,
              details: error instanceof Error ? error.message : String(error),
            }
          );
          logger.logError(errorResult);

          return {
            success: false,
            filesDownloaded: filesWritten,
            filesFailed: fetchResult.failed.length,
            exitCode: errorResult.exitCode,
          };
        }
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

    // All projects processed successfully
    // Return success with file counts
    // TODO: Track total counts across all projects for multi-project support
    return {
      success: true,
      filesDownloaded: 0, // Will be updated in Task 6.1 for multi-project tracking
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
