/**
 * CLI Entry Point
 *
 * Main execution logic that orchestrates all components
 */

import { Octokit } from 'octokit';
import { parseArguments } from './parser.js';
import { validateInput } from './validator.js';
import { parseRepositoryPath, fetchDirectoryContents } from '../github/fetcher.js';
import { fetchFilesInParallel } from '../github/parallel-fetcher.js';
import { writeFile } from '../filesystem/writer.js';
import { ProgressReporter } from '../reporting/progress-reporter.js';
import { ErrorHandler } from '../reporting/error-handler.js';
import { Logger } from '../reporting/logger.js';
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
  const logger = new Logger();
  const errorHandler = new ErrorHandler();

  try {
    // Step 1: Parse arguments
    const args = parseArguments(argv);

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

    // Step 3.5: Initialize progress reporter and report start
    const reporter = new ProgressReporter({
      verbose: args.verbose,
      useColor: true,
    });

    reporter.reportStart(args.repository, args.project, subdir, effectiveBranch);

    // Step 4: Initialize Octokit client
    const octokit = new Octokit({
      auth: process.env.GITHUB_TOKEN,
    });

    // Step 5: Fetch directory listings
    logger.info('Fetching directory listings from GitHub', {
      repository: args.repository,
      project: args.project,
      ...(effectiveBranch && { branch: effectiveBranch }),
    });

    const specPath = buildRemotePath(subdir, args.project, 'specs');
    const steeringPath = buildRemotePath(subdir, '', 'steering');

    // Fetch spec directory (required)
    const specContents = await fetchDirectoryContents(octokit, owner, repo, specPath, effectiveBranch);

    // Fetch steering directory (optional - may not exist)
    let steeringContents: ContentItem[] = [];
    try {
      steeringContents = await fetchDirectoryContents(octokit, owner, repo, steeringPath, effectiveBranch);
    } catch (error) {
      if (args.verbose) {
        logger.warn('Steering directory not found, skipping', {
          path: steeringPath,
        });
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

    // Step 6: Fetch all file contents in parallel
    logger.info('Fetching file contents', { count: allFiles.length });

    const filePaths = allFiles.map((item) => item.path);
    const fetchResult = await fetchFilesInParallel(
      octokit,
      owner,
      repo,
      filePaths,
      5, // maxConcurrency
      effectiveBranch
    );

    if (args.verbose) {
      logger.info('Files fetched', {
        success: fetchResult.success.length,
        failed: fetchResult.failed.length,
      });
    }

    // Step 7: Write files to local filesystem
    let filesDownloaded = 0;
    let filesFailed = fetchResult.failed.length;

    // Track written files for metadata (when --track is used)
    const writtenFiles: Array<{ path: string; sha: string; size: number; localPath: string }> = [];

    for (const file of fetchResult.success) {
      const currentIndex = fetchResult.success.indexOf(file) + 1;
      const totalFiles = fetchResult.success.length;

      reporter.reportProgress(currentIndex, totalFiles, file.path);

      try {
        // Resolve output path
        const localPath = resolveOutputPath(args.output, file.path);

        // Write file
        const writeResult = await writeFile(localPath, file.content, {
          force: args.force,
          prompt: !args.force,
          dryRun: args.dryRun,
          verbose: args.verbose,
        });

        if (writeResult.written) {
          filesDownloaded++;
          reporter.reportSuccess(`Saved: ${file.path}`);

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
            `Skipped: ${file.path} (${writeResult.reason})`
          );
        }
      } catch (error) {
        filesFailed++;
        const errorResult = errorHandler.handle(error, {
          filePath: file.path,
          details: error instanceof Error ? error.message : String(error),
        });
        reporter.reportError(`Failed: ${file.path} - ${errorResult.message}`);
        logger.logError(errorResult);
      }
    }

    // Report fetch failures
    for (const failedFile of fetchResult.failed) {
      const errorResult = errorHandler.handle(new Error(failedFile.error), {
        filePath: failedFile.path,
        details: failedFile.error,
      });
      reporter.reportError(`Failed to fetch: ${failedFile.path} - ${errorResult.message}`);
      logger.logError(errorResult);
    }

    // Step 8: Save metadata if --track option is used
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
        } catch (error) {
          // Metadata doesn't exist
          if (args.verbose) {
            logger.info('Creating new metadata file');
          }
        }

        // Upsert project
        await upsertProject({
          repository: args.repository,
          projectName: args.project,
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

            await upsertFile(args.repository, args.project, fileMetadata, metadataPath);

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

    // Step 9: Report summary
    reporter.reportSummary(filesDownloaded, filesFailed, subdir);

    logger.info('Execution completed', {
      filesDownloaded,
      filesFailed,
      total: filesDownloaded + filesFailed,
    });

    return {
      success: filesFailed === 0,
      filesDownloaded,
      filesFailed,
      exitCode: filesFailed > 0 ? 1 : 0,
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
 * @param logger - Logger instance
 * @returns Execution result
 */
async function handleCheckUpdates(
  args: ParsedArguments,
  logger: Logger
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
 * @param logger - Logger instance
 * @returns Execution result
 */
async function handleUpdate(
  args: ParsedArguments,
  logger: Logger
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
