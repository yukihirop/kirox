/**
 * Status Classifier
 *
 * Helper functions for classifying and interpreting file update status
 */

import { UpdateStatus } from './update-checker.js';

/**
 * File status information (simplified from UpdateCheckResult)
 */
export interface FileStatusInfo {
  /** File path */
  path: string;
  /** Update status */
  status: UpdateStatus;
  /** Whether local file has been edited */
  hasLocalEdit: boolean;
  /** Whether remote file has been updated */
  hasRemoteUpdate: boolean;
  /** Remote SHA (optional) */
  remoteSha?: string;
  /** Recorded SHA (optional) */
  recordedSha?: string;
  /** Current local hash (optional) */
  currentHash?: string;
  /** Recorded local hash (optional) */
  recordedHash?: string;
  /** Error message (optional) */
  error?: string;
}

/**
 * Check if file is up to date (no changes)
 *
 * @param statusInfo - File status information
 * @returns True if file is up to date
 */
export function isUpToDate(statusInfo: FileStatusInfo): boolean {
  return statusInfo.status === UpdateStatus.UP_TO_DATE;
}

/**
 * Check if file is updatable (remote updated, no local edit)
 *
 * @param statusInfo - File status information
 * @returns True if file can be updated automatically
 */
export function isUpdatable(statusInfo: FileStatusInfo): boolean {
  return (
    statusInfo.status === UpdateStatus.REMOTE_UPDATED &&
    !statusInfo.hasLocalEdit &&
    statusInfo.hasRemoteUpdate
  );
}

/**
 * Check if file has conflict (both remote and local changed)
 *
 * @param statusInfo - File status information
 * @returns True if file has conflict
 */
export function hasConflict(statusInfo: FileStatusInfo): boolean {
  return (
    (statusInfo.status === UpdateStatus.CONFLICT ||
      (statusInfo.status === UpdateStatus.REMOTE_DELETED && statusInfo.hasLocalEdit)) &&
    statusInfo.hasLocalEdit &&
    statusInfo.hasRemoteUpdate
  );
}

/**
 * Check if file is locally edited only (no remote update)
 *
 * @param statusInfo - File status information
 * @returns True if file is locally edited only
 */
export function isLocalEditedOnly(statusInfo: FileStatusInfo): boolean {
  return (
    statusInfo.status === UpdateStatus.LOCAL_EDITED &&
    statusInfo.hasLocalEdit &&
    !statusInfo.hasRemoteUpdate
  );
}

/**
 * Get human-readable status message
 *
 * @param statusInfo - File status information
 * @returns Human-readable status message in Japanese
 */
export function getStatusMessage(statusInfo: FileStatusInfo): string {
  switch (statusInfo.status) {
    case UpdateStatus.UP_TO_DATE:
      return 'Up to date (no changes)';

    case UpdateStatus.REMOTE_UPDATED:
      return 'Update available (remote updated)';

    case UpdateStatus.LOCAL_EDITED:
      return 'Local edits exist (no remote update)';

    case UpdateStatus.CONFLICT:
      return 'Conflict (remote update & local edits)';

    case UpdateStatus.LOCAL_DELETED:
      return 'Deleted locally';

    case UpdateStatus.REMOTE_DELETED:
      return 'Deleted remotely';

    case UpdateStatus.ERROR:
      return `Error: ${statusInfo.error || 'Unknown error'}`;

    default:
      return 'Unknown status';
  }
}

/**
 * Check if file can be automatically updated
 *
 * @param statusInfo - File status information
 * @returns True if file can be updated automatically (no conflicts)
 */
export function canAutoUpdate(statusInfo: FileStatusInfo): boolean {
  return (
    statusInfo.status === UpdateStatus.REMOTE_UPDATED &&
    !statusInfo.hasLocalEdit &&
    statusInfo.hasRemoteUpdate
  );
}
