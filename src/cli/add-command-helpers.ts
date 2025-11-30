/**
 * Helper functions for add command execution
 *
 * Task 5.2: Extract helper functions from executeAddCommand
 * Following Single Responsibility Principle and clean code guidelines
 */

import { existsSync } from 'fs';
import type { Octokit } from 'octokit';
import { loadConfig } from '../config/loader.js';
import { mergeConfig } from '../config/merger.js';
import { getMetadataPath, isDuplicateProject } from './metadata-utils.js';
import { loadMetadata, upsertProject } from '../tracking/metadata-manager.js';
import { MetadataError, MetadataErrorType } from '../tracking/types.js';
import { fetchDirectoryContents } from '../github/fetcher.js';
import { fetchFilesInParallel } from '../github/parallel-fetcher.js';
import { buildRemotePath, resolveOutputPath } from '../filesystem/path-utils.js';
import { writeFile } from '../filesystem/writer.js';
import { calculateFileHash } from '../tracking/hash-calculator.js';
import type { PinoLogger } from '../reporting/pino-logger.js';
import type { ProgressReporter } from '../reporting/progress-reporter.js';
import type { ParsedArguments, MergedConfig, MetadataCheckResult } from './types.js';
import type { FileMetadata, ProjectMetadata, Metadata } from '../tracking/types.js';
import type { ContentItem } from '../github/fetcher.js';

/**
 * Load configuration file and merge with CLI arguments
 *
 * @param args - Parsed command-line arguments
 * @param logger - Logger instance for verbose output
 * @returns Merged configuration
 */
export async function loadAndMergeConfig(
  args: ParsedArguments,
  logger: PinoLogger
): Promise<MergedConfig> {
  const fileConfig = await loadConfig(args.config);
  const merged = mergeConfig(args, fileConfig);

  if (args.verbose) {
    logger.info('Configuration loaded and merged', {
      config: args.config || 'default',
      subdir: merged.subdir,
      branch: merged.branch,
    });
  }

  return merged;
}

/**
 * Check metadata existence and detect duplicate projects
 *
 * @param args - Parsed command-line arguments
 * @param config - Merged configuration
 * @param logger - Logger instance
 * @param errorHandler - Error handler instance
 * @returns Metadata check result or error execution result
 */
export async function checkMetadataAndDuplicates(
  args: ParsedArguments,
  config: MergedConfig,
  logger: PinoLogger
): Promise<MetadataCheckResult | null> {
  // Skip metadata operations when --track is disabled
  if (!args.track) {
    logger.info('Metadata tracking is disabled. Use --track to enable.');

    if (args.verbose) {
      logger.info('Skipping metadata operations', {
        track: args.track,
        message: 'Files will be downloaded but not tracked in metadata',
      });
    }

    return null;
  }

  const metadataPath = getMetadataPath(args.output);
  let metadata: Metadata;
  let isNewMetadata = false;

  try {
    metadata = await loadMetadata(metadataPath);

    if (args.verbose) {
      logger.info('Metadata file found', { path: metadataPath });
    }
  } catch (error) {
    // Handle metadata not found error - create empty metadata
    if (error instanceof MetadataError && error.type === MetadataErrorType.NOT_FOUND) {
      metadata = {
        version: '1.0',
        projects: [],
      };

      isNewMetadata = true;

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
      // Re-throw other metadata errors
      throw error;
    }
  }

  // Check for duplicate projects (skip if metadata is new)
  if (!isNewMetadata) {
    for (const projectName of args.projects) {
      const isDuplicate = isDuplicateProject(
        metadata,
        args.repository,
        projectName,
        config.subdir
      );

      if (isDuplicate && !config.force) {
        logger.warn('Project already exists. Use --force to overwrite.', {
          repository: args.repository,
          projectName,
          subdir: config.subdir,
        });

        throw new Error(
          `Project "${projectName}" already exists. Use --force to overwrite.`
        );
      }

      if (isDuplicate && config.force && args.verbose) {
        logger.info('Overwriting existing project with --force option', {
          repository: args.repository,
          projectName,
          subdir: config.subdir,
        });
      }
    }
  } else if (args.verbose) {
    logger.info('Skipping duplicate check for new metadata', {
      message: 'No existing projects to check against',
    });
  }

  return {
    metadataPath,
    metadata,
    isNewMetadata,
  };
}

/**
 * Fetch files from GitHub and write to local filesystem
 *
 * @param octokit - Octokit instance for GitHub API
 * @param owner - Repository owner
 * @param repo - Repository name
 * @param projectName - Project name to fetch
 * @param effectiveBranch - Branch to fetch from
 * @param subdir - Subdirectory path
 * @param args - Parsed arguments
 * @param config - Merged configuration
 * @param reporter - Progress reporter
 * @param logger - Logger instance
 * @param isFirstProject - Whether this is the first project in multi-project operation
 * @param steeringFetched - Whether steering directory has been fetched
 * @returns Fetch and write result with success/failed file counts
 */
export async function fetchAndWriteFiles(
  octokit: Octokit,
  owner: string,
  repo: string,
  projectName: string,
  effectiveBranch: string | undefined,
  subdir: string,
  args: ParsedArguments,
  config: MergedConfig,
  reporter: ProgressReporter,
  logger: PinoLogger,
  isFirstProject: boolean,
  steeringFetched: { value: boolean }
): Promise<{
  success: Array<{ path: string; content: string; sha: string; size: number }>;
  failed: number;
}> {
  logger.verbose('Fetching directory listings from GitHub', {
    repository: args.repository,
    project: projectName,
    ...(effectiveBranch && { branch: effectiveBranch }),
  });

  const specPath = buildRemotePath(subdir, projectName, 'specs');

  // Fetch spec directory (required)
  let specContents: ContentItem[];
  try {
    specContents = await fetchDirectoryContents(octokit, owner, repo, specPath, effectiveBranch);
  } catch (error) {
    // Check if error is 404 (Not Found)
    if (error && typeof error === 'object' && 'status' in error && error.status === 404) {
      const branchInfo = effectiveBranch ? ` on branch "${effectiveBranch}"` : '';
      const subdirInfo = subdir ? ` in subdirectory "${subdir}"` : '';

      throw new Error(
        `The .kiro folder was not found in repository "${args.repository}"${branchInfo}${subdirInfo}. ` +
          `Please check: Repository (${owner}/${repo})` +
          (effectiveBranch ? `, Branch (${effectiveBranch})` : '') +
          (subdir ? `, Subdirectory (${subdir})` : '')
      );
    }

    throw error;
  }

  // Fetch steering directory only for first project
  let steeringContents: ContentItem[] = [];
  if (isFirstProject && !steeringFetched.value) {
    const steeringPath = buildRemotePath(subdir, '', 'steering');
    try {
      steeringContents = await fetchDirectoryContents(
        octokit,
        owner,
        repo,
        steeringPath,
        effectiveBranch
      );
      steeringFetched.value = true;
    } catch (error) {
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

  // Filter out existing steering files unless --force is specified
  if (steeringFiles.length > 0 && !config.force) {
    steeringFiles = steeringFiles.filter((steeringFile) => {
      const localPath = resolveOutputPath(args.output, steeringFile.path);
      const fileExists = existsSync(localPath);

      if (fileExists && args.verbose) {
        logger.info('Steering file already exists, skipping', {
          path: steeringFile.path,
          localPath,
        });
      }

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

  // Fetch file contents in parallel
  const filePaths = allFiles.map((item) => item.path);

  if (args.verbose) {
    logger.info('Starting parallel file fetch', {
      fileCount: filePaths.length,
      maxConcurrency: 5,
    });
  }

  const fetchResult = await fetchFilesInParallel(
    octokit,
    owner,
    repo,
    filePaths,
    5,
    effectiveBranch
  );

  if (args.verbose) {
    logger.info('Parallel file fetch completed', {
      successCount: fetchResult.success.length,
      failedCount: fetchResult.failed.length,
    });
  }

  // Log network errors for failed file fetches
  if (fetchResult.failed.length > 0) {
    for (const failedFile of fetchResult.failed) {
      logger.error(failedFile.error, {
        path: failedFile.path,
        retryable: failedFile.retryable,
      });
    }
  }

  // Write files to local filesystem
  const writeOptions = {
    force: config.force,
    prompt: false,
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

  let filesWritten = 0;
  let filesSkipped = 0;
  const writeErrors: Array<{ path: string; error: string }> = [];

  const totalFiles = fetchResult.success.length;
  const displayProjectName = args.projects.length > 1 ? projectName : undefined;

  for (const [fileIndex, file] of fetchResult.success.entries()) {
    const currentFileNumber = fileIndex + 1;

    try {
      reporter.reportProgress(currentFileNumber, totalFiles, file.path, displayProjectName);

      const localPath = resolveOutputPath(args.output, file.path);

      if (args.verbose) {
        logger.info('Writing file', {
          remotePath: file.path,
          localPath,
          size: file.size,
        });
      }

      const writeResult = await writeFile(localPath, file.content, writeOptions);

      if (writeResult.written) {
        filesWritten++;
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
      const errorMessage = error instanceof Error ? error.message : String(error);
      writeErrors.push({
        path: file.path,
        error: errorMessage,
      });

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

  if (writeErrors.length > 0) {
    throw new Error(
      `Failed to write ${writeErrors.length} file(s): ${writeErrors.map((e) => e.path).join(', ')}`
    );
  }

  return {
    success: fetchResult.success,
    failed: fetchResult.failed.length,
  };
}

/**
 * Update metadata with fetched files and report success
 *
 * @param projectName - Project name
 * @param fetchResult - Fetch result with success/failed files
 * @param args - Parsed arguments
 * @param config - Merged configuration
 * @param metadataCheck - Metadata check result
 * @param logger - Logger instance
 * @param reporter - Progress reporter
 * @returns Number of files processed
 */
export async function updateMetadataAndReport(
  projectName: string,
  fetchResult: {
    success: Array<{ path: string; content: string; sha: string; size: number }>;
    failed: number;
  },
  args: ParsedArguments,
  config: MergedConfig,
  metadataCheck: MetadataCheckResult | null,
  logger: PinoLogger,
  reporter: ProgressReporter,
  projectsLength: number
): Promise<void> {
  // Skip metadata operations when --track is disabled
  if (!args.track || !metadataCheck) {
    if (args.verbose) {
      logger.info('Project files downloaded (metadata tracking disabled)', {
        project: projectName,
        fileCount: fetchResult.success.length,
      });
    }
    return;
  }

  // Create FileMetadata array
  const fileMetadataList: FileMetadata[] = [];
  const currentTimestamp = new Date().toISOString();

  for (const file of fetchResult.success) {
    const localPath = resolveOutputPath(args.output, file.path);

    try {
      const localHash = await calculateFileHash(localPath);

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

  // Save metadata
  await upsertProject(projectMetadata, metadataCheck.metadataPath);

  logger.info(`Project '${projectName}' successfully added with ${fileMetadataList.length} file(s)`, {
    project: projectName,
    fileCount: fileMetadataList.length,
  });

  if (args.verbose) {
    logger.info('Metadata updated successfully', {
      project: projectName,
      fileCount: fileMetadataList.length,
    });
  }

  // Display project summary for multi-project operations
  if (projectsLength > 1) {
    reporter.reportProjectSummary(projectName, fetchResult.success.length, fetchResult.failed);
  }
}
