/**
 * Update Checker
 *
 * Checks for file updates by comparing local and remote states
 */

import type { Octokit } from 'octokit';
import { fetchFileMetadata, GitHubMetadataError, GitHubMetadataErrorType } from '../github/metadata-fetcher.js';
import { detectLocalEdit, EditStatus } from './local-edit-detector.js';
import type { FileMetadata } from './types.js';

/**
 * Update status enum
 */
export enum UpdateStatus {
  UP_TO_DATE = 'UP_TO_DATE', // No changes (remote SHA match & no local edit)
  REMOTE_UPDATED = 'REMOTE_UPDATED', // Remote updated (remote SHA changed & no local edit)
  LOCAL_EDITED = 'LOCAL_EDITED', // Local edited (remote SHA match & local edit)
  CONFLICT = 'CONFLICT', // Both changed (remote SHA changed & local edit)
  LOCAL_DELETED = 'LOCAL_DELETED', // Local file deleted
  REMOTE_DELETED = 'REMOTE_DELETED', // Remote file deleted
  ERROR = 'ERROR', // Error during check
}

/**
 * Update check result
 */
export interface UpdateCheckResult {
  /** Update status */
  status: UpdateStatus;
  /** Remote SHA (latest from GitHub) */
  remoteSha?: string;
  /** Recorded SHA (from metadata) */
  recordedSha: string;
  /** Current local hash (calculated) */
  currentHash?: string;
  /** Recorded local hash (from metadata) */
  recordedHash: string;
  /** Whether local file has been edited */
  hasLocalEdit: boolean;
  /** Whether remote file has been updated */
  hasRemoteUpdate: boolean;
  /** Error message (if status is ERROR) */
  error?: string;
}

/**
 * Check for file updates
 *
 * @param client - Octokit client instance
 * @param owner - Repository owner
 * @param repo - Repository name
 * @param localPath - Local file path (absolute)
 * @param recordedMetadata - Recorded metadata from .kiro-meta.json
 * @returns Update check result
 */
export async function checkFileUpdate(
  client: Octokit,
  owner: string,
  repo: string,
  localPath: string,
  recordedMetadata: FileMetadata
): Promise<UpdateCheckResult> {
  const recordedSha = recordedMetadata.sha;
  const recordedHash = recordedMetadata.localHash;

  try {
    // Step 1: Fetch latest remote metadata
    let remoteSha: string | undefined;
    let remoteDeleted = false;

    try {
      const remoteMetadata = await fetchFileMetadata(client, owner, repo, recordedMetadata.path);
      remoteSha = remoteMetadata.sha;
    } catch (error) {
      if (error instanceof GitHubMetadataError && error.type === GitHubMetadataErrorType.FILE_NOT_FOUND) {
        // Remote file deleted
        remoteDeleted = true;
      } else if (error instanceof GitHubMetadataError && error.type === GitHubMetadataErrorType.RATE_LIMIT) {
        // Rate limit error
        return {
          status: UpdateStatus.ERROR,
          recordedSha,
          recordedHash,
          hasLocalEdit: false,
          hasRemoteUpdate: false,
          error: `Rate limit exceeded: ${error.message}`,
        };
      } else {
        // Other API errors
        const errorMessage = error instanceof GitHubMetadataError
          ? `${error.message}${error.details ? ` (${error.details})` : ''}`
          : error instanceof Error ? error.message : String(error);

        return {
          status: UpdateStatus.ERROR,
          recordedSha,
          recordedHash,
          hasLocalEdit: false,
          hasRemoteUpdate: false,
          error: errorMessage,
        };
      }
    }

    // Step 2: Detect local edits
    const editResult = await detectLocalEdit(localPath, recordedHash);

    const hasLocalEdit = editResult.status === EditStatus.EDITED || editResult.status === EditStatus.DELETED;
    const localDeleted = editResult.status === EditStatus.DELETED;
    const currentHash = editResult.currentHash;

    // Step 3: Compare remote SHA
    const hasRemoteUpdate = !remoteDeleted && remoteSha !== recordedSha;

    // Step 4: Determine update status
    if (localDeleted) {
      return {
        status: UpdateStatus.LOCAL_DELETED,
        remoteSha,
        recordedSha,
        currentHash,
        recordedHash,
        hasLocalEdit: true,
        hasRemoteUpdate,
      };
    }

    if (remoteDeleted) {
      return {
        status: UpdateStatus.REMOTE_DELETED,
        remoteSha,
        recordedSha,
        currentHash,
        recordedHash,
        hasLocalEdit,
        hasRemoteUpdate: true,
      };
    }

    if (hasRemoteUpdate && hasLocalEdit) {
      // Conflict: both remote and local changed
      return {
        status: UpdateStatus.CONFLICT,
        remoteSha,
        recordedSha,
        currentHash,
        recordedHash,
        hasLocalEdit: true,
        hasRemoteUpdate: true,
      };
    }

    if (hasRemoteUpdate) {
      // Remote updated, local not edited
      return {
        status: UpdateStatus.REMOTE_UPDATED,
        remoteSha,
        recordedSha,
        currentHash,
        recordedHash,
        hasLocalEdit: false,
        hasRemoteUpdate: true,
      };
    }

    if (hasLocalEdit) {
      // Local edited, remote not updated
      return {
        status: UpdateStatus.LOCAL_EDITED,
        remoteSha,
        recordedSha,
        currentHash,
        recordedHash,
        hasLocalEdit: true,
        hasRemoteUpdate: false,
      };
    }

    // No changes
    return {
      status: UpdateStatus.UP_TO_DATE,
      remoteSha,
      recordedSha,
      currentHash,
      recordedHash,
      hasLocalEdit: false,
      hasRemoteUpdate: false,
    };
  } catch (error) {
    // Unexpected error
    return {
      status: UpdateStatus.ERROR,
      recordedSha,
      recordedHash,
      hasLocalEdit: false,
      hasRemoteUpdate: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
