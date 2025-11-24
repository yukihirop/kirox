/**
 * Add Command Entry Point
 *
 * Main execution logic for the 'add' subcommand
 * Task 2.1: executeAddCommand function basic structure
 * Task 7.1: Interactive mode entry condition detection
 */

import { existsSync } from 'fs';
import { Octokit } from 'octokit';
import { parseArguments } from './parser.js';
import { validateInput } from './validator.js';
import { getMetadataPath, isDuplicateProject } from './metadata-utils.js';
import { PinoLogger } from '../reporting/pino-logger.js';
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
import { shouldEnterInteractiveMode, promptMissingArguments } from './interactive-prompt.js';
import type { ExecutionResult } from './types.js';
import type { Metadata, ProjectMetadata, FileMetadata } from '../tracking/types.js';
import type { ContentItem } from '../github/fetcher.js';

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
  // Step 1: Parse arguments first to get verbose flag for PinoLogger initialization
  const args = parseArguments(argv);

  // Step 2: Initialize reporting components with verbose flag
  // PinoLogger requires verbose flag at construction time for log level control
  const logger = new PinoLogger(args.verbose);
  const errorHandler = new ErrorHandler();

  // Task 8.4: Set up signal handlers for Ctrl+C interrupt handling
  // Track whether operation was interrupted to prevent metadata saves
  let interrupted = false;

  // Define signal handler function that will be registered and cleaned up
  const handleInterrupt = () => {
    interrupted = true;
    console.log('\nOperation was interrupted.');
    process.exit(130); // Standard exit code for SIGINT (128 + 2)
  };

  // Register signal handlers for SIGINT (Ctrl+C) and SIGTERM
  process.on('SIGINT', handleInterrupt);
  process.on('SIGTERM', handleInterrupt);

  try {
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
    let config = mergeConfig(args, fileConfig);

    // Log execution start if verbose mode is enabled
    if (args.verbose) {
      logger.info('Executing add command', {
        repository: args.repository,
        projects: args.projects,
        config: args.config || 'default',
      });
    }

    // Step 4.6: Check if interactive mode should be entered (Task 7.1)
    // This check happens BEFORE validation to allow interactive prompts
    // to collect missing repository or project information
    //
    // shouldEnterInteractiveMode returns true if:
    // - Repository or project name is missing, AND
    // - Process is running in TTY environment, AND
    // - --check-updates and --update options are NOT specified
    const enterInteractiveMode = shouldEnterInteractiveMode(args);

    // Task 8.8 & 8.9: Declare metadata variables that will be initialized at different times
    // Metadata processing is only performed when --track option is enabled
    let metadataPath: string | undefined;
    let metadata: Metadata | undefined;
    let isNewMetadata = false;

    // Task 8.9: Check if metadata tracking is enabled
    // If --track is not specified (default: false), skip all metadata operations
    if (!args.track) {
      // Task 8.9: Log info message indicating metadata tracking is disabled
      logger.info('Metadata tracking is disabled. Use --track to enable.');

      if (args.verbose) {
        logger.info('Skipping metadata operations', {
          track: args.track,
          message: 'Files will be downloaded but not tracked in metadata',
        });
      }
    }

    // Task 8.8: Load metadata at different times based on interactive mode
    // Task 8.9: Only load metadata when --track is enabled
    if (!enterInteractiveMode && args.track) {
      // Non-interactive mode: Load metadata immediately (BEFORE prompts)
      // This provides fast feedback to the user
      metadataPath = getMetadataPath(args.output);

      try {
        metadata = await loadMetadata(metadataPath);

        if (args.verbose) {
          logger.info('Metadata file found', { path: metadataPath });
        }
      } catch (error) {
        // Task 2.4: Handle metadata not found error - create empty metadata instead of error
        if (error instanceof MetadataError && error.type === MetadataErrorType.NOT_FOUND) {
          // Create empty metadata object
          metadata = {
            version: '1.0',
            projects: [],
          };

          isNewMetadata = true;

          // Log info message about creating new metadata
          logger.info('Creating new metadata file', {
            path: metadataPath,
            message: 'New metadata file will be created after successful project addition',
          });

          if (args.verbose) {
            logger.info('Metadata file does not exist, starting with empty metadata', {
              path: metadataPath,
            });
          }
        } else {
          // Re-throw other metadata errors (e.g., INVALID_FORMAT, INVALID_SCHEMA)
          // These will be caught by the outer catch block and handled generically
          throw error;
        }
      }
    }

    if (enterInteractiveMode) {
      // Task 7.2, 7.3, 7.4: Call promptMissingArguments
      // Task 8.8: Do NOT pass metadata to promptMissingArguments in interactive mode
      // Metadata will be loaded AFTER prompts complete
      try {
        const completedArgs = await promptMissingArguments(
          args,
          fileConfig,
          logger,
          args.verbose,
          undefined // Task 8.8: No metadata passed (will be loaded after prompts)
        );

        // Update args with completed values from interactive prompts
        args.repository = completedArgs.repository;
        args.projects = completedArgs.projects;
        args.output = completedArgs.output;
        args.subdir = completedArgs.subdir;

        // Task 8.6: Re-merge config after interactive mode to reflect updated args.subdir
        // Interactive mode may have set args.subdir via Tree API, so we need to merge again
        // to ensure config.subdir includes the value from interactive mode
        config = mergeConfig(args, fileConfig);

        if (args.verbose) {
          logger.info('Interactive prompts completed', {
            repository: args.repository,
            projects: args.projects,
            subdir: args.subdir, // Log subdir for debugging
          });
        }
      } catch (error) {
        // Handle interactive mode cancellation or errors
        if (error instanceof Error && error.message === 'Operation cancelled') {
          // User cancelled - this is not an error condition
          console.log('Operation cancelled');
          return {
            success: false,
            filesDownloaded: 0,
            filesFailed: 0,
            exitCode: 0, // User intentionally cancelled
          };
        }

        // Re-throw other errors
        throw error;
      }

      // Task 8.8 & 8.9: Interactive mode - Load metadata AFTER prompts complete
      // Now args.output has been updated by promptMissingArguments
      // Task 8.9: Only load metadata when --track is enabled
      if (args.track) {
        metadataPath = getMetadataPath(args.output);

        try {
          metadata = await loadMetadata(metadataPath);

          if (args.verbose) {
            logger.info('Metadata file found', { path: metadataPath });
          }
        } catch (error) {
          // Task 2.4: Handle metadata not found error - create empty metadata instead of error
          if (error instanceof MetadataError && error.type === MetadataErrorType.NOT_FOUND) {
            // Create empty metadata object
            metadata = {
              version: '1.0',
              projects: [],
            };

            isNewMetadata = true;

            // Log info message about creating new metadata
            logger.info('Creating new metadata file', {
              path: metadataPath,
              message: 'New metadata file will be created after successful project addition',
            });

            if (args.verbose) {
              logger.info('Metadata file does not exist, starting with empty metadata', {
                path: metadataPath,
              });
            }
          } else {
            // Re-throw other metadata errors (e.g., INVALID_FORMAT, INVALID_SCHEMA)
            // These will be caught by the outer catch block and handled generically
            throw error;
          }
        }
      }
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

    // Task 8.8 & 8.9: Assert metadata is initialized at this point when --track is enabled
    // Both interactive and non-interactive paths initialize metadata if --track is true
    // Task 8.9: Skip this check if --track is false (metadata operations disabled)
    if (args.track && (!metadata || !metadataPath)) {
      throw new Error('Internal error: metadata not initialized when --track is enabled');
    }

    // Step 7: Detect duplicate projects (Task 2.3)
    // Task 2.4: Skip duplicate check if metadata is new (empty projects array)
    // Task 8.9: Skip duplicate check if --track is false (metadata operations disabled)
    // Check if project already exists in metadata
    // Handle based on --force option:
    // - Without --force: Warn user and skip to prevent accidental overwrites
    // - With --force: Log verbose message and continue to overwrite
    //
    // A project is considered duplicate if repository + projectName + subdir all match.
    // Different subdir values create separate projects, even with the same repo + name.
    if (args.track && !isNewMetadata && metadata) {
      // Only check for duplicates if metadata already exists (Task 2.4) and --track is enabled (Task 8.9)
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
    } else if (args.track && isNewMetadata) {
      // Task 2.4: Skip duplicate check for new metadata
      if (args.verbose) {
        logger.info('Skipping duplicate check for new metadata', {
          message: 'No existing projects to check against',
        });
      }
    } else if (!args.track) {
      // Task 8.9: Skip duplicate check when metadata tracking is disabled
      if (args.verbose) {
        logger.info('Skipping duplicate check (metadata tracking disabled)', {
          track: args.track,
        });
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
      logger.verbose('Using subdirectory', { subdir });
    }

    // Track steering directory fetch status to avoid duplication across multiple projects
    // Task 3.1 Requirement 4.4: Steering files should only be fetched once
    let steeringFetched = false;
    const projects = args.projects.length > 0 ? args.projects : [''];

    // Task 6.1: Track success/failure counts across all projects
    let totalFilesDownloaded = 0;
    let totalFilesFailed = 0;
    let successfulProjects = 0;
    let failedProjects = 0;

    for (const [index, projectName] of projects.entries()) {
      const isFirstProject = index === 0;

      try {
        // Step 10.1: Fetch directory listings for current project
        logger.verbose('Fetching directory listings from GitHub', {
          repository: args.repository,
          project: projectName,
          ...(effectiveBranch && { branch: effectiveBranch }),
        });

        const specPath = buildRemotePath(subdir, projectName, 'specs');

        // Fetch spec directory (required)
        // Task 8.5: Handle 404 errors for .kiro folder not found
        let specContents: ContentItem[];
        try {
          specContents = await fetchDirectoryContents(
            octokit,
            owner,
            repo,
            specPath,
            effectiveBranch
          );
        } catch (error) {
          // Task 8.5: Check if error is 404 (Not Found)
          if (error && typeof error === 'object' && 'status' in error && error.status === 404) {
            // User-friendly error message for .kiro folder not found
            const branchInfo = effectiveBranch ? ` on branch "${effectiveBranch}"` : '';
            const subdirInfo = subdir ? ` in subdirectory "${subdir}"` : '';

            console.error(
              `The .kiro folder was not found in repository "${args.repository}"${branchInfo}${subdirInfo}.`
            );
            console.error('');
            console.error('Please check:');
            console.error(`  - Repository: ${owner}/${repo}`);
            if (effectiveBranch) {
              console.error(`  - Branch: ${effectiveBranch}`);
            }
            if (subdir) {
              console.error(`  - Subdirectory: ${subdir}`);
            }
            console.error('');
            console.error('Ensure the .kiro folder exists at the specified location.');

            // Return with exit code 1 (user error)
            return {
              success: false,
              filesDownloaded: 0,
              filesFailed: 0,
              exitCode: 1,
            };
          }

          // Re-throw other errors
          throw error;
        }

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
        let steeringFiles = steeringContents.filter((item) => item.type === 'file');

        // Task 8.7: Filter out existing steering files unless --force is specified
        // This prevents re-fetching and re-saving steering files on subsequent add executions
        if (steeringFiles.length > 0 && !config.force) {
          steeringFiles = steeringFiles.filter((steeringFile) => {
            // Resolve local path for the steering file
            const localPath = resolveOutputPath(args.output, steeringFile.path);

            // Check if file already exists locally
            const fileExists = existsSync(localPath);

            if (fileExists && args.verbose) {
              logger.info('Steering file already exists, skipping', {
                path: steeringFile.path,
                localPath,
              });
            }

            // Keep file in list if it doesn't exist (needs to be fetched)
            // Remove file from list if it exists (skip fetching)
            return !fileExists;
          });
        }

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

        // Task 8.1: Log network errors for failed file fetches
        // Display user-friendly error messages for network failures
        if (fetchResult.failed.length > 0) {
          for (const failedFile of fetchResult.failed) {
            logger.error(failedFile.error, {
              path: failedFile.path,
              retryable: failedFile.retryable,
            });
          }
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
              reporter.reportSuccess(`Saved: ${file.path}`, displayProjectName);
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

        // If any write errors occurred, handle them but continue with other projects (Task 6.1)
        if (writeErrors.length > 0) {
          const errorResult = errorHandler.handle(
            new Error(`Failed to write ${writeErrors.length} file(s)`),
            {
              project: projectName,
              details: `Write errors: ${writeErrors.map(e => e.path).join(', ')}`,
            }
          );
          logger.logError(errorResult);

          // Task 6.1: Increment failure counter and continue to next project
          failedProjects++;
          totalFilesFailed += fetchResult.failed.length + writeErrors.length;
          continue; // Skip metadata update for this project and move to next
        }

        // Step 13: Update metadata (Task 5.1)
        // Task 8.9: Only perform metadata operations when --track is enabled
        if (args.track) {
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

          // Task 8.4: Check if operation was interrupted before saving metadata
          // Prevents partial metadata saves on interrupt
          if (interrupted) {
            // Don't save metadata - operation was interrupted
            continue;
          }

          // Save ProjectMetadata to metadata file using upsertProject
          try {
            await upsertProject(projectMetadata, metadataPath!);

            // Task 5.2: Display success summary message (non-verbose, user-facing)
            // Always show this message after successful metadata update
            logger.info(`Project '${projectName}' successfully added with ${fileMetadataList.length} file(s)`, {
              project: projectName,
              fileCount: fileMetadataList.length,
            });

            // Verbose log with additional details
            if (args.verbose) {
              logger.info('Metadata updated successfully', {
                project: projectName,
                fileCount: fileMetadataList.length,
              });
            }

            // Task 6.1: Increment success counters for this project
            successfulProjects++;
            totalFilesDownloaded += fetchResult.success.length;
            totalFilesFailed += fetchResult.failed.length;

            // Task 6.2: Display project summary for multi-project operations
            if (projects.length > 1) {
              reporter.reportProjectSummary(projectName, fetchResult.success.length, fetchResult.failed.length);
            }
          } catch (error) {
            // Metadata save failure is critical for this project
            // Task 6.1: Log error but continue processing other projects
            const errorResult = errorHandler.handle(
              new Error('Failed to update metadata'),
              {
                project: projectName,
                details: error instanceof Error ? error.message : String(error),
              }
            );
            logger.logError(errorResult);

            // Increment failure counter
            failedProjects++;
            totalFilesFailed += fetchResult.success.length;
          }
        } else {
          // Task 8.9: When --track is disabled, only count files as downloaded
          // No metadata operations are performed
          successfulProjects++;
          totalFilesDownloaded += fetchResult.success.length;
          totalFilesFailed += fetchResult.failed.length;

          if (args.verbose) {
            logger.info('Project files downloaded (metadata tracking disabled)', {
              project: projectName,
              fileCount: fetchResult.success.length,
            });
          }
        }
      } catch (error) {
        // Handle project-specific errors
        // Task 6.1: Log error but continue processing other projects (partial failure tolerance)
        const errorResult = errorHandler.handle(error, {
          project: projectName,
          details: error instanceof Error ? error.message : String(error),
        });
        logger.logError(errorResult);

        // Increment failure counter
        failedProjects++;
      }
    }

    // Task 6.1: Return aggregated results across all projects
    // Success if at least one project succeeded
    const hasAnySuccess = successfulProjects > 0;

    if (args.verbose) {
      logger.info('All projects processed', {
        successfulProjects,
        failedProjects,
        totalFilesDownloaded,
        totalFilesFailed,
      });
    }

    // Task 6.2: Display overall summary for multi-project operations
    if (projects.length > 1) {
      const totalProjects = successfulProjects + failedProjects;
      reporter.reportOverallSummary(totalProjects, totalFilesDownloaded, totalFilesFailed);
    }

    return {
      success: hasAnySuccess,
      filesDownloaded: totalFilesDownloaded,
      filesFailed: totalFilesFailed,
      exitCode: hasAnySuccess ? 0 : 1,
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
  } finally {
    // Task 8.4: Clean up signal handlers after command completion
    // Remove signal handlers to prevent memory leaks and unintended behavior
    process.removeListener('SIGINT', handleInterrupt);
    process.removeListener('SIGTERM', handleInterrupt);
  }
}
