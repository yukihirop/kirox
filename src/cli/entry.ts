/**
 * CLI Entry Point
 *
 * Main execution logic that orchestrates all components
 */

import { Octokit } from 'octokit';
import { parseArguments } from './parser.js';
import { validateInput } from './validator.js';
import {
  shouldEnterInteractiveMode,
  promptMissingArguments,
  checkTTYEnvironment,
  handleInteractiveError,
} from './interactive-prompt.js';
import { parseRepositoryPath, fetchDirectoryContents } from '../github/fetcher.js';
import { fetchFilesInParallel } from '../github/parallel-fetcher.js';
import { writeFile } from '../filesystem/writer.js';
import { ProgressReporter } from '../reporting/progress-reporter.js';
import { ErrorHandler } from '../reporting/error-handler.js';
import { PinoLogger } from '../reporting/pino-logger.js';
import { resolveOutputPath, buildRemotePath } from '../filesystem/path-utils.js';
import { loadMetadata, upsertProject, upsertFile } from '../tracking/metadata-manager.js';
import { calculateFileHash } from '../tracking/hash-calculator.js';
import { loadConfig } from '../config/loader.js';
import { mergeConfig } from '../config/merger.js';
import type { ExecutionResult, ParsedArguments } from './types.js';
import type { ContentItem } from '../github/fetcher.js';
import type { FileMetadata } from '../tracking/types.js';
import path from 'path';

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
 * Execute main CLI logic
 *
 * Orchestrates the complete flow:
 * 1. Parse arguments
 * 2. Validate input
 * 3. Fetch files from GitHub
 * 4. Write files to local filesystem
 * 5. Report progress and summary
 *
 * @param argv - Command-line arguments
 * @returns Execution result with success status and file counts
 */
export async function execute(argv: string[]): Promise<ExecutionResult> {
  // Step 1: Parse arguments (needed early for PinoLogger initialization with verbose flag)
  let args = parseArguments(argv);

  // Initialize logger with verbose flag from parsed arguments
  const logger = new PinoLogger(args.verbose);
  const errorHandler = new ErrorHandler();

  try {

    // Step 1.5: Check if interactive mode is needed
    if (shouldEnterInteractiveMode(args)) {
      // Check TTY environment
      const ttyCheck = checkTTYEnvironment(logger);
      if (!ttyCheck.success) {
        return {
          success: false,
          filesDownloaded: 0,
          filesFailed: 0,
          exitCode: ttyCheck.exitCode,
        };
      }

      // Load config file for interactive mode defaults
      const fileConfig = await loadConfig(args.config);

      // Prompt for missing arguments with config file defaults
      // Pass logger and verbose flag for project suggestion feature
      try {
        args = await promptMissingArguments(args, fileConfig, logger, args.verbose);
      } catch (error) {
        // Handle interactive mode errors
        const errorResult = handleInteractiveError(error, logger);
        return {
          success: false,
          filesDownloaded: 0,
          filesFailed: 0,
          exitCode: errorResult.exitCode,
        };
      }
    }

    // Step 2: Validate input
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

    // Step 2.3: Load and merge configuration
    const fileConfig = await loadConfig(args.config);
    const mergedConfig = mergeConfig(args, fileConfig);

    // Get subdir from merged config (default to empty string if undefined)
    const subdir = mergedConfig.subdir || '';

    if (args.verbose && subdir) {
      logger.info('Using subdirectory', { subdir });
    }

    // Step 2.5: Handle --check-updates command
    if (args.checkUpdates) {
      return await handleCheckUpdates(args, logger);
    }

    // Step 2.6: Handle --update command
    if (args.update) {
      return await handleUpdate(args, logger);
    }

    // Step 3: Parse repository and determine effective branch
    const { owner, repo, branch } = parseRepositoryPath(args.repository);

    // Get branch from merged config (CLI branch takes precedence over config file)
    const effectiveBranch = branch || mergedConfig.branch;

    // Step 3.5: Initialize progress reporter
    const reporter = new ProgressReporter({
      verbose: args.verbose,
      useColor: true,
    });

    // Step 4: Initialize Octokit client
    const octokit = new Octokit({
      auth: process.env.GITHUB_TOKEN,
    });

    // Step 4.5: Initialize aggregated counters for multi-project support
    let totalFilesDownloaded = 0;
    let totalFilesFailed = 0;
    let successfulProjects = 0; // Track successful projects (task 9.2)
    const failedProjectsList: string[] = []; // Track failed projects (task 9.3)
    const successfulProjectsList: string[] = []; // Track successful projects (task 9.3)

    // Task 4.1: Project loop control for --steering mode
    // In --steering mode, execute project loop only once with empty string project name
    // In normal mode, maintain existing project loop logic
    const projects = args.steering ? [''] : (args.projects.length > 0 ? args.projects : ['']);

    // Report start
    // Use multi-project display if multiple projects, otherwise use single-project display
    if (projects.length === 1) {
      reporter.reportStart(args.repository, projects[0] || '', subdir, effectiveBranch);
    } else {
      reporter.reportStart(args.repository, projects, subdir, effectiveBranch);
    }

    // Step 5: Loop through projects
    for (const [index, projectName] of projects.entries()) {
      const isFirstProject = index === 0;
      let projectFilesDownloaded = 0;
      let projectFilesFailed = 0;

      try {
        // Step 5.1: Fetch directory listings for current project
        logger.verbose('Fetching directory listings from GitHub', {
          repository: args.repository,
          project: projectName,
          ...(effectiveBranch && { branch: effectiveBranch }),
        });

        // Task 4.1: Conditional directory fetching based on --steering mode
        let specContents: ContentItem[] = [];
        let steeringContents: ContentItem[] = [];

        if (args.steering) {
          // In --steering mode: only fetch .kiro/steering directory
          const steeringPath = buildRemotePath(subdir, '', 'steering');
          try {
            steeringContents = await fetchDirectoryContents(octokit, owner, repo, steeringPath, effectiveBranch);
          } catch (_error) {
            // Task 4.3: In --steering mode, throw error when steering directory is not found
            // Include repository path and subdirectory path in error message (Requirement 7.2)
            const pathInfo = subdir ? `${args.repository}/${subdir}` : args.repository;
            throw new Error(`.kiro/steering directory not found in ${pathInfo}`);
          }
        } else {
          // In normal mode: fetch both specs and steering directories
          const specPath = buildRemotePath(subdir, projectName, 'specs');

          // Fetch spec directory (required)
          specContents = await fetchDirectoryContents(octokit, owner, repo, specPath, effectiveBranch);

          // Fetch steering directory only for first project (to avoid duplication)
          if (isFirstProject) {
            const steeringPath = buildRemotePath(subdir, '', 'steering');
            try {
              steeringContents = await fetchDirectoryContents(octokit, owner, repo, steeringPath, effectiveBranch);
            } catch (_error) {
              if (args.verbose) {
                logger.warn('Steering directory not found, skipping', {
                  path: steeringPath,
                });
              }
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

        // Task 4.4: Empty directory handling for --steering mode
        // When steering directory is empty, display info message and exit with code 0 (Requirement 7.5)
        if (args.steering && allFiles.length === 0) {
          const pathInfo = subdir ? ` in subdirectory ${subdir}` : '';
          reporter.reportVerbose(`No files found in .kiro/steering${pathInfo}`);
          logger.info('No files found in .kiro/steering', {
            repository: args.repository,
            ...(subdir && { subdir }),
          });

          // Continue to the summary reporting (exit code 0, no files downloaded/failed)
          // This is considered a successful operation (business logic perspective)
        }

        // Step 5.2: Fetch all file contents in parallel
        logger.verbose('Fetching file contents', { count: allFiles.length });

        const filePaths = allFiles.map((item) => item.path);

        // Task 14.5: Pass progress callback to display spinner during file fetch
        const displayProjectName = projects.length > 1 ? projectName : undefined;
        const fetchResult = await fetchFilesInParallel(
          octokit,
          owner,
          repo,
          filePaths,
          5, // maxConcurrency
          effectiveBranch,
          // Progress callback - called before fetching each file
          (current, total, filePath) => {
            reporter.reportProgress(current, total, filePath, displayProjectName);
          }
        );

        if (args.verbose) {
          logger.info('Files fetched', {
            success: fetchResult.success.length,
            failed: fetchResult.failed.length,
          });
        }

        // Step 5.3: Write files to local filesystem
        let filesDownloaded = 0;
        let filesFailed = fetchResult.failed.length;

        // Track written files for metadata (when --track is used)
        const writtenFiles: Array<{ path: string; sha: string; size: number; localPath: string }> = [];

        for (const file of fetchResult.success) {
          // Task 14.5: Progress is now reported during file fetch (in fetchFilesInParallel callback)
          // No need to call reportProgress here

          // Show project name prefix for multi-project operations
          const displayProjectName = projects.length > 1 ? projectName : undefined;

          // Verbose: Show detailed fetch information with branch
          if (args.verbose && effectiveBranch) {
            const branchInfo = `${owner}/${repo}#${effectiveBranch}/${file.path}`;
            reporter.reportVerbose(`取得中: ${branchInfo}`, displayProjectName);
          }

          try {
            // Resolve output path
            const localPath = resolveOutputPath(args.output, file.path);

            // Task 14.7: Pause spinner before writeFile to prevent hidden readline prompts
            // When prompt=true and file exists, writeFile() shows readline confirmation prompt
            // If spinner is active, the prompt is hidden from user, making it appear frozen
            reporter.pauseSpinner(displayProjectName);

            // Write file
            const writeResult = await writeFile(localPath, file.content, {
              force: args.force,
              prompt: !args.force,
              dryRun: args.dryRun,
              verbose: args.verbose,
            });

            // Task 14.7: No need to resume spinner here
            // reportSuccess() / reportError() will use the paused spinner and clean it up

            if (writeResult.written) {
              filesDownloaded++;
              reporter.reportSuccess(`Saved: ${file.path}`, displayProjectName);

              // Track written file for metadata
              if (args.track) {
                writtenFiles.push({
                  path: file.path,
                  sha: file.sha,
                  size: file.size,
                  localPath,
                });
              }
            } else if (writeResult.skipped) {
              reporter.reportVerbose(
                `Skipped: ${file.path} (${writeResult.reason})`,
                displayProjectName
              );
            }
          } catch (error) {
            filesFailed++;
            const errorResult = errorHandler.handle(error, {
              filePath: file.path,
              details: error instanceof Error ? error.message : String(error),
            });
            reporter.reportError(`Failed: ${file.path} - ${errorResult.message}`, displayProjectName);
            logger.logError(errorResult);
          }
        }

        // Report fetch failures
        for (const failedFile of fetchResult.failed) {
          const errorResult = errorHandler.handle(new Error(failedFile.error), {
            filePath: failedFile.path,
            details: failedFile.error,
          });
          reporter.reportError(`Failed to fetch: ${failedFile.path} - ${errorResult.message}`, displayProjectName);
          logger.logError(errorResult);
        }

        // Step 5.4: Update project counters
        projectFilesDownloaded = filesDownloaded;
        projectFilesFailed = filesFailed;

        // Step 5.5: Save metadata if --track option is used
        if (args.track && writtenFiles.length > 0) {
          try {
            if (args.verbose) {
              logger.info('Saving tracking metadata', {
                filesCount: writtenFiles.length,
              });
            }

            const metadataPath = getMetadataPath(args.output);

            // Check if metadata exists
            try {
              const existingMetadata = await loadMetadata(metadataPath);
              if (args.verbose) {
                logger.info('Loaded existing metadata', {
                  projectsCount: existingMetadata.projects.length,
                });
              }
            } catch (_error) {
              // Metadata doesn't exist
              if (args.verbose) {
                logger.info('Creating new metadata file');
              }
            }

            // Upsert project
            await upsertProject({
              repository: args.repository,
              projectName: projectName,
              subdir: args.subdir,
              fetchedAt: new Date().toISOString(),
              files: [],
            }, metadataPath);

            // Calculate hashes and upsert files
            for (const file of writtenFiles) {
              try {
                // Calculate local file hash
                const localHash = await calculateFileHash(file.localPath);

                const fileMetadata: FileMetadata = {
                  path: file.path,
                  sha: file.sha,
                  size: file.size,
                  localHash,
                  fetchedAt: new Date().toISOString(),
                };

                await upsertFile(args.repository, projectName, fileMetadata, metadataPath);

                if (args.verbose) {
                  logger.info('File metadata saved', {
                    path: file.path,
                    sha: file.sha,
                    hash: localHash,
                  });
                }
              } catch (error) {
                // Log hash calculation error but continue
                logger.warn('Failed to calculate file hash', {
                  path: file.path,
                  error: error instanceof Error ? error.message : String(error),
                });
              }
            }

            // Success message for metadata save
            reporter.reportSuccess(`Saved metadata: ${metadataPath}`);

            if (args.verbose) {
              logger.info('Metadata saved successfully', {
                path: metadataPath,
                filesTracked: writtenFiles.length,
              });
            }
          } catch (error) {
            // Metadata save failure should not fail the entire operation
            // Files were already successfully downloaded
            logger.warn('Failed to save tracking metadata', {
              error: error instanceof Error ? error.message : String(error),
            });
            reporter.reportVerbose(
              'Warning: Failed to save tracking metadata, but files were downloaded successfully'
            );
          }
        }

        // Step 5.6: Update total counters
        totalFilesDownloaded += projectFilesDownloaded;
        totalFilesFailed += projectFilesFailed;
        successfulProjects++; // Increment successful project count (task 9.2)
        successfulProjectsList.push(projectName); // Track successful project (task 9.3)

        // Step 5.7: Display project summary for multi-project operations
        if (projects.length > 1) {
          reporter.reportProjectSummary(projectName, projectFilesDownloaded, projectFilesFailed);
        }

      } catch (error) {
        // Handle project-specific errors (task 9.1)
        const errorResult = errorHandler.handle(error, {
          project: projectName,
          details: error instanceof Error ? error.message : String(error),
        });
        reporter.reportProjectError(projectName, errorResult.message);
        logger.logError(errorResult);
        // Note: Do not increment successfulProjects here (project failed)
        // Track failure for proper success/failure determination
        totalFilesFailed++;
        failedProjectsList.push(projectName); // Track failed project (task 9.3)
      }
    } // End of project loop

    // Step 5.8: Check if all projects failed (task 9.2)
    if (projects.length > 1 && successfulProjects === 0) {
      const errorMessage = 'None of the specified projects were found';
      reporter.reportError(errorMessage);
      logger.error(errorMessage, {
        projectsAttempted: projects.length,
        successfulProjects: 0,
      });

      return {
        success: false,
        filesDownloaded: 0,
        filesFailed: 0,
        exitCode: 1,
      };
    }

    // Step 6: Report summary
    reporter.reportSummary(totalFilesDownloaded, totalFilesFailed, subdir, effectiveBranch);

    // Step 6.1: Report overall summary for multi-project operations
    if (projects.length > 1) {
      reporter.reportOverallSummary(projects.length, totalFilesDownloaded, totalFilesFailed);

      // Step 6.2: Report partial failure summary (task 9.3)
      if (failedProjectsList.length > 0 && successfulProjectsList.length > 0) {
        reporter.reportPartialFailureSummary(failedProjectsList, successfulProjectsList);
      }
    }

    logger.info('Execution completed', {
      filesDownloaded: totalFilesDownloaded,
      filesFailed: totalFilesFailed,
      total: totalFilesDownloaded + totalFilesFailed,
    });

    return {
      success: totalFilesFailed === 0,
      filesDownloaded: totalFilesDownloaded,
      filesFailed: totalFilesFailed,
      exitCode: totalFilesFailed > 0 ? 1 : 0,
    };
  } catch (error) {
    // Handle unexpected errors
    const errorResult = errorHandler.handle(error);

    // Log error with details for debugging
    if (error instanceof Error) {
      logger.error('Unexpected error', {
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

/**
 * Handle --check-updates command
 *
 * @param args - Parsed arguments
 * @param logger - PinoLogger instance
 * @returns Execution result
 */
async function handleCheckUpdates(
  args: ParsedArguments,
  logger: PinoLogger
): Promise<ExecutionResult> {
  const errorHandler = new ErrorHandler();

  try {
    const metadataPath = getMetadataPath(args.output);

    // Step 1: Load metadata
    if (args.verbose) {
      logger.info('Loading tracking metadata');
    }

    const metadata = await loadMetadata(metadataPath);

    if (args.verbose) {
      logger.info('Metadata loaded', {
        projectsCount: metadata.projects.length,
        totalFiles: metadata.projects.reduce((sum, p) => sum + p.files.length, 0),
      });
    }

    // Step 2: Initialize Octokit client
    const { Octokit } = await import('octokit');
    const octokit = new Octokit({
      auth: process.env.GITHUB_TOKEN,
    });

    // Step 3: Check updates for all projects
    const { checkAllFiles } = await import('../tracking/batch-update-checker.js');
    const { parseRepositoryPath } = await import('../github/fetcher.js');

    // Initialize totals
    let totalFiles = 0;
    let totalUpToDate = 0;
    let totalRemoteUpdated = 0;
    let totalLocalEdited = 0;
    let totalConflict = 0;
    let totalLocalDeleted = 0;
    let totalRemoteDeleted = 0;
    let totalError = 0;

    for (const project of metadata.projects) {
      const { owner, repo } = parseRepositoryPath(project.repository);

      if (args.verbose) {
        logger.info('Checking updates for project', {
          repository: project.repository,
          projectName: project.projectName,
          filesCount: project.files.length,
        });
      }

      const checkResult = await checkAllFiles(octokit, owner, repo, '.', project);

      // Aggregate summary
      totalFiles += checkResult.totalFiles;
      totalUpToDate += checkResult.upToDate;
      totalRemoteUpdated += checkResult.updatable;
      totalLocalEdited += checkResult.localEdited;
      totalConflict += checkResult.conflict;
      totalLocalDeleted += checkResult.localDeleted;
      totalRemoteDeleted += checkResult.remoteDeleted;
      totalError += checkResult.errors;

      // Display results for this project
      console.log(`\nProject: ${project.repository}/${project.projectName}`);

      if (checkResult.updatable > 0) {
        console.log(`\n📥 Updates available (${checkResult.updatable} files):`);
        for (const update of checkResult.files) {
          if (update.status === 'REMOTE_UPDATED') {
            console.log(`  - ${update.path}`);
          }
        }
      }

      if (checkResult.localEdited > 0) {
        console.log(`\n✏️  Locally edited (${checkResult.localEdited} files):`);
        for (const update of checkResult.files) {
          if (update.status === 'LOCAL_EDITED') {
            console.log(`  - ${update.path}`);
          }
        }
      }

      if (checkResult.conflict > 0) {
        console.log(`\n⚠️  Conflicts (${checkResult.conflict} files):`);
        for (const update of checkResult.files) {
          if (update.status === 'CONFLICT') {
            console.log(`  - ${update.path}`);
          }
        }
      }

      if (checkResult.upToDate > 0 && args.verbose) {
        console.log(`\n✓ Up to date (${checkResult.upToDate} files)`);
      }
    }

    // Step 4: Display summary
    console.log('\n=== Summary ===');
    console.log(`Total files checked: ${totalFiles}`);
    console.log(`✓ Up to date: ${totalUpToDate}`);
    console.log(`📥 Updates available: ${totalRemoteUpdated}`);
    console.log(`✏️  Locally edited: ${totalLocalEdited}`);
    console.log(`⚠️  Conflicts: ${totalConflict}`);

    if (totalLocalDeleted > 0) {
      console.log(`🗑️  Locally deleted: ${totalLocalDeleted}`);
    }
    if (totalRemoteDeleted > 0) {
      console.log(`🗑️  Remotely deleted: ${totalRemoteDeleted}`);
    }
    if (totalError > 0) {
      console.log(`❌ Errors: ${totalError}`);
    }

    return {
      success: true,
      filesDownloaded: 0,
      filesFailed: 0,
      exitCode: 0,
    };
  } catch (error) {
    const errorResult = errorHandler.handle(error);

    if (error instanceof Error) {
      logger.error('Failed to check updates', {
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

/**
 * Handle --update command
 *
 * @param args - Parsed arguments
 * @param logger - PinoLogger instance
 * @returns Execution result
 */
async function handleUpdate(
  args: ParsedArguments,
  logger: PinoLogger
): Promise<ExecutionResult> {
  const errorHandler = new ErrorHandler();

  try {
    const metadataPath = getMetadataPath(args.output);

    // Step 1: Load metadata
    if (args.verbose) {
      logger.info('Loading tracking metadata');
    }

    const metadata = await loadMetadata(metadataPath);

    if (args.verbose) {
      logger.info('Metadata loaded', {
        projectsCount: metadata.projects.length,
        totalFiles: metadata.projects.reduce((sum, p) => sum + p.files.length, 0),
      });
    }

    // Step 2: Initialize Octokit client
    const { Octokit } = await import('octokit');
    const octokit = new Octokit({
      auth: process.env.GITHUB_TOKEN,
    });

    // Step 3: Import required modules
    const { checkAllFiles } = await import('../tracking/batch-update-checker.js');
    const { applyUpdates } = await import('../tracking/batch-file-updater.js');
    const { parseRepositoryPath } = await import('../github/fetcher.js');

    // Initialize totals
    let totalFiles = 0;
    let totalUpdated = 0;
    let totalSkipped = 0;
    let totalFailed = 0;

    for (const project of metadata.projects) {
      const { owner, repo } = parseRepositoryPath(project.repository);

      if (args.verbose) {
        logger.info('Checking updates for project', {
          repository: project.repository,
          projectName: project.projectName,
          filesCount: project.files.length,
        });
      }

      // Step 4: Check for updates
      const checkResult = await checkAllFiles(octokit, owner, repo, '.', project);

      if (args.verbose) {
        logger.info('Update check completed', {
          updatable: checkResult.updatable,
          conflicts: checkResult.conflict,
          upToDate: checkResult.upToDate,
        });
      }

      // Step 5: Apply updates
      console.log(`\nProject: ${project.repository}/${project.projectName}`);

      const applyResult = await applyUpdates(
        octokit,
        owner,
        repo,
        '.',
        checkResult.files,
        { force: args.force }
      );

      // Aggregate totals
      totalFiles += applyResult.totalFiles;
      totalUpdated += applyResult.updated;
      totalSkipped += applyResult.skipped;
      totalFailed += applyResult.failed;

      // Display results for this project
      if (applyResult.updated > 0) {
        console.log(`\n✅ Updated (${applyResult.updated} files):`);
        for (const file of applyResult.updatedFiles) {
          console.log(`  - ${file.path}`);
        }
      }

      if (applyResult.skipped > 0) {
        console.log(`\n⏭️  Skipped (${applyResult.skipped} files):`);
        for (const file of applyResult.skippedFiles) {
          const reasonText = {
            'up-to-date': 'Already up to date',
            'local-edit': 'Locally edited',
            'conflict': 'Conflict (both remote and local changed)',
            'local-deleted': 'Locally deleted',
            'remote-deleted': 'Remotely deleted',
            'error': 'Error during check',
          }[file.reason] || file.reason;

          console.log(`  - ${file.path} (${reasonText})`);
        }
      }

      if (applyResult.failed > 0) {
        console.log(`\n❌ Failed (${applyResult.failed} files):`);
        for (const file of applyResult.failedFiles) {
          console.log(`  - ${file.path}: ${file.error}`);
        }
      }

      if (applyResult.updated === 0 && applyResult.skipped === 0 && applyResult.failed === 0) {
        console.log('\n✓ All files are up to date');
      }
    }

    // Step 6: Display summary
    console.log('\n=== Summary ===');
    console.log(`Total files processed: ${totalFiles}`);
    console.log(`✅ Updated: ${totalUpdated}`);
    console.log(`⏭️  Skipped: ${totalSkipped}`);

    if (totalFailed > 0) {
      console.log(`❌ Failed: ${totalFailed}`);
    }

    return {
      success: totalFailed === 0,
      filesDownloaded: totalUpdated,
      filesFailed: totalFailed,
      exitCode: totalFailed > 0 ? 1 : 0,
    };
  } catch (error) {
    const errorResult = errorHandler.handle(error);

    if (error instanceof Error) {
      logger.error('Failed to apply updates', {
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
