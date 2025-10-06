/**
 * Batch Update Checker
 *
 * Checks update status for all files in a project and generates summary
 */

import type { Octokit } from 'octokit';
import path from 'path';
import { checkFileUpdate, UpdateStatus, type UpdateCheckResult } from './update-checker.js';
import type { ProjectMetadata } from './types.js';

/**
 * Update summary for all files
 */
export interface UpdateSummary {
  /** Total number of files checked */
  totalFiles: number;
  /** Number of up-to-date files */
  upToDate: number;
  /** Number of updatable files (remote updated, no local edit) */
  updatable: number;
  /** Number of locally edited files (no remote update) */
  localEdited: number;
  /** Number of conflicting files (both remote and local changed) */
  conflict: number;
  /** Number of locally deleted files */
  localDeleted: number;
  /** Number of remotely deleted files */
  remoteDeleted: number;
  /** Number of files with errors */
  errors: number;
  /** Detailed status for each file */
  files: Array<UpdateCheckResult & { path: string }>;
}

/**
 * Check all files in a project for updates
 *
 * @param client - Octokit client instance
 * @param owner - Repository owner
 * @param repo - Repository name
 * @param baseDir - Base directory for local files
 * @param project - Project metadata
 * @returns Update summary with file counts and details
 */
export async function checkAllFiles(
  client: Octokit,
  owner: string,
  repo: string,
  baseDir: string,
  project: ProjectMetadata
): Promise<UpdateSummary> {
  // Initialize summary
  const summary: UpdateSummary = {
    totalFiles: project.files.length,
    upToDate: 0,
    updatable: 0,
    localEdited: 0,
    conflict: 0,
    localDeleted: 0,
    remoteDeleted: 0,
    errors: 0,
    files: [],
  };

  // Handle empty file list
  if (project.files.length === 0) {
    return summary;
  }

  // Check each file
  const checkPromises = project.files.map(async (fileMetadata) => {
    const localPath = path.join(baseDir, fileMetadata.path);

    try {
      const result = await checkFileUpdate(client, owner, repo, localPath, fileMetadata);
      return { ...result, path: fileMetadata.path };
    } catch (error) {
      // Unexpected error (should not happen as checkFileUpdate handles errors)
      return {
        path: fileMetadata.path,
        status: UpdateStatus.ERROR,
        recordedSha: fileMetadata.sha,
        recordedHash: fileMetadata.localHash,
        hasLocalEdit: false,
        hasRemoteUpdate: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });

  // Wait for all checks to complete
  const results = await Promise.all(checkPromises);

  // Classify results and update summary
  for (const result of results) {
    summary.files.push(result);

    switch (result.status) {
      case UpdateStatus.UP_TO_DATE:
        summary.upToDate++;
        break;

      case UpdateStatus.REMOTE_UPDATED:
        summary.updatable++;
        break;

      case UpdateStatus.LOCAL_EDITED:
        summary.localEdited++;
        break;

      case UpdateStatus.CONFLICT:
        summary.conflict++;
        break;

      case UpdateStatus.LOCAL_DELETED:
        summary.localDeleted++;
        break;

      case UpdateStatus.REMOTE_DELETED:
        summary.remoteDeleted++;
        break;

      case UpdateStatus.ERROR:
        summary.errors++;
        break;
    }
  }

  return summary;
}
