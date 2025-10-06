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
import { resolveOutputPath, getSpecDirectoryPath, getSteeringDirectoryPath } from '../filesystem/path-utils.js';
import { loadMetadata, upsertProject, upsertFile } from '../tracking/metadata-manager.js';
import { calculateFileHash } from '../tracking/hash-calculator.js';
import type { ExecutionResult } from './types.js';
import type { ContentItem } from '../github/fetcher.js';
import type { FileMetadata } from '../tracking/types.js';

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

    // Step 3: Initialize progress reporter
    const reporter = new ProgressReporter({
      verbose: args.verbose,
      useColor: true,
    });

    reporter.reportStart(args.repository, args.project);

    // Step 4: Initialize Octokit client
    const octokit = new Octokit({
      auth: process.env.GITHUB_TOKEN,
    });

    const { owner, repo } = parseRepositoryPath(args.repository);

    // Step 5: Fetch directory listings
    logger.info('Fetching directory listings from GitHub', {
      repository: args.repository,
      project: args.project,
    });

    const specPath = getSpecDirectoryPath(args.project);
    const steeringPath = getSteeringDirectoryPath();

    // Fetch spec directory (required)
    const specContents = await fetchDirectoryContents(octokit, owner, repo, specPath);

    // Fetch steering directory (optional - may not exist)
    let steeringContents: ContentItem[] = [];
    try {
      steeringContents = await fetchDirectoryContents(octokit, owner, repo, steeringPath);
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
      5 // maxConcurrency
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

        // Check if metadata exists
        try {
          const existingMetadata = await loadMetadata();
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
        });

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

            await upsertFile(args.repository, args.project, fileMetadata);

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

        if (args.verbose) {
          logger.info('Metadata saved successfully');
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
    reporter.reportSummary(filesDownloaded, filesFailed);

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
