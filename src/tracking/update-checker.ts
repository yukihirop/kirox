import type { Octokit } from 'octokit';
import { fetchFileMetadata, GitHubMetadataError, GitHubMetadataErrorType } from '../github/metadata-fetcher.js';
import { detectLocalEdit, EditStatus } from './local-edit-detector.js';
import type { FileMetadata } from './types.js';

export enum UpdateStatus {
  UP_TO_DATE = 'UP_TO_DATE',
  REMOTE_UPDATED = 'REMOTE_UPDATED',
  LOCAL_EDITED = 'LOCAL_EDITED',
  CONFLICT = 'CONFLICT',
  LOCAL_DELETED = 'LOCAL_DELETED',
  REMOTE_DELETED = 'REMOTE_DELETED',
  ERROR = 'ERROR',
}

export interface UpdateCheckResult {
  status: UpdateStatus;
  remoteSha?: string;
  recordedSha: string;
  currentHash?: string;
  recordedHash: string;
  hasLocalEdit: boolean;
  hasRemoteUpdate: boolean;
  error?: string;
}

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
    let remoteSha: string | undefined;
    let remoteDeleted = false;

    try {
      const remoteMetadata = await fetchFileMetadata(client, owner, repo, recordedMetadata.path);
      remoteSha = remoteMetadata.sha;
    } catch (error) {
      if (error instanceof GitHubMetadataError && error.type === GitHubMetadataErrorType.FILE_NOT_FOUND) {
        remoteDeleted = true;
      } else if (error instanceof GitHubMetadataError && error.type === GitHubMetadataErrorType.RATE_LIMIT) {
        return {
          status: UpdateStatus.ERROR,
          recordedSha,
          recordedHash,
          hasLocalEdit: false,
          hasRemoteUpdate: false,
          error: `Rate limit exceeded: ${error.message}`,
        };
      } else {
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

    const editResult = await detectLocalEdit(localPath, recordedHash);

    const hasLocalEdit = editResult.status === EditStatus.EDITED || editResult.status === EditStatus.DELETED;
    const localDeleted = editResult.status === EditStatus.DELETED;
    const currentHash = editResult.currentHash;

    const hasRemoteUpdate = !remoteDeleted && remoteSha !== recordedSha;

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
