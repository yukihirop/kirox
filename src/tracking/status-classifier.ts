import { UpdateStatus } from './update-checker.js';

export interface FileStatusInfo {
  path: string;
  status: UpdateStatus;
  hasLocalEdit: boolean;
  hasRemoteUpdate: boolean;
  remoteSha?: string;
  recordedSha?: string;
  currentHash?: string;
  recordedHash?: string;
  error?: string;
}

export function isUpToDate(statusInfo: FileStatusInfo): boolean {
  return statusInfo.status === UpdateStatus.UP_TO_DATE;
}

export function isUpdatable(statusInfo: FileStatusInfo): boolean {
  return (
    statusInfo.status === UpdateStatus.REMOTE_UPDATED &&
    !statusInfo.hasLocalEdit &&
    statusInfo.hasRemoteUpdate
  );
}

export function hasConflict(statusInfo: FileStatusInfo): boolean {
  return (
    (statusInfo.status === UpdateStatus.CONFLICT ||
      (statusInfo.status === UpdateStatus.REMOTE_DELETED && statusInfo.hasLocalEdit)) &&
    statusInfo.hasLocalEdit &&
    statusInfo.hasRemoteUpdate
  );
}

export function isLocalEditedOnly(statusInfo: FileStatusInfo): boolean {
  return (
    statusInfo.status === UpdateStatus.LOCAL_EDITED &&
    statusInfo.hasLocalEdit &&
    !statusInfo.hasRemoteUpdate
  );
}

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

export function canAutoUpdate(statusInfo: FileStatusInfo): boolean {
  return (
    statusInfo.status === UpdateStatus.REMOTE_UPDATED &&
    !statusInfo.hasLocalEdit &&
    statusInfo.hasRemoteUpdate
  );
}
