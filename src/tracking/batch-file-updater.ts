/**
 * Batch File Updater
 *
 * Applies updates to all updatable files and generates summary
 */

import path from 'path';
import type { Octokit } from 'octokit';
import { filterUpdatableFiles, type FilterOptions } from './update-filter.js';
import { updateFile, type UpdateResult } from './file-updater.js';
import type { UpdateCheckResult } from './update-checker.js';
import type { FileMetadata } from './types.js';

/**
 * Updated file information
 */
export interface UpdatedFileInfo {
  /** File path */
  path: string;
  /** Old SHA before update */
  oldSha: string;
  /** New SHA after update */
  newSha: string;
  /** New hash after update */
  newHash: string;
  /** New size after update */
  newSize: number;
}

/**
 * Skipped file information
 */
export interface SkippedFileInfo {
  /** File path */
  path: string;
  /** Skip reason */
  reason: string;
}

/**
 * Failed file information
 */
export interface FailedFileInfo {
  /** File path */
  path: string;
  /** Error message */
  error: string;
}

/**
 * Apply summary
 */
export interface ApplySummary {
  /** Total number of files processed */
  totalFiles: number;
  /** Number of successfully updated files */
  updated: number;
  /** Number of skipped files */
  skipped: number;
  /** Number of failed files */
  failed: number;
  /** Detailed information about updated files */
  updatedFiles: UpdatedFileInfo[];
  /** Detailed information about skipped files */
  skippedFiles: SkippedFileInfo[];
  /** Detailed information about failed files */
  failedFiles: FailedFileInfo[];
}

/**
 * Apply updates to all updatable files
 *
 * @param client - Octokit client instance
 * @param owner - Repository owner
 * @param repo - Repository name
 * @param baseDir - Base directory for local files
 * @param results - Update check results with file paths
 * @param options - Filter options (e.g., force)
 * @returns Apply summary with counts and details
 */
export async function applyUpdates(
  client: Octokit,
  owner: string,
  repo: string,
  baseDir: string,
  results: Array<UpdateCheckResult & { path: string }>,
  options: FilterOptions = {}
): Promise<ApplySummary> {
  // Initialize summary
  const summary: ApplySummary = {
    totalFiles: results.length,
    updated: 0,
    skipped: 0,
    failed: 0,
    updatedFiles: [],
    skippedFiles: [],
    failedFiles: [],
  };

  // Handle empty results
  if (results.length === 0) {
    return summary;
  }

  // Filter updatable files
  const filtered = filterUpdatableFiles(results, options);

  // Record skipped files
  for (const { result, reason } of filtered.skipped) {
    const fileWithPath = results.find((r) => r.recordedSha === result.recordedSha);
    if (fileWithPath) {
      summary.skippedFiles.push({
        path: fileWithPath.path,
        reason,
      });
      summary.skipped++;
    }
  }

  // Update each updatable file
  const updatePromises = filtered.updatable.map(async (result) => {
    // Find the corresponding file with path
    const fileWithPath = results.find((r) => r.recordedSha === result.recordedSha);
    if (!fileWithPath) {
      return null;
    }

    const localPath = path.join(baseDir, fileWithPath.path);

    // Create file metadata from result
    const fileMetadata: FileMetadata = {
      path: fileWithPath.path,
      sha: result.recordedSha,
      size: 0, // Size not used in update
      localHash: result.recordedHash,
      fetchedAt: '', // Not used in update
    };

    try {
      const updateResult = await updateFile(client, owner, repo, localPath, fileMetadata);
      return { fileWithPath, updateResult };
    } catch (error) {
      // Unexpected error (should not happen as updateFile handles errors)
      return {
        fileWithPath,
        updateResult: {
          success: false,
          oldSha: result.recordedSha,
          error: error instanceof Error ? error.message : String(error),
        } as UpdateResult,
      };
    }
  });

  // Wait for all updates to complete
  const updateResults = await Promise.all(updatePromises);

  // Process update results
  for (const updateInfo of updateResults) {
    if (!updateInfo) {
      continue;
    }

    const { fileWithPath, updateResult } = updateInfo;

    if (updateResult.success) {
      // Record successful update
      summary.updatedFiles.push({
        path: fileWithPath.path,
        oldSha: updateResult.oldSha,
        newSha: updateResult.newSha!,
        newHash: updateResult.newHash!,
        newSize: updateResult.newSize!,
      });
      summary.updated++;
    } else {
      // Record failed update
      summary.failedFiles.push({
        path: fileWithPath.path,
        error: updateResult.error || 'Unknown error',
      });
      summary.failed++;
    }
  }

  return summary;
}
