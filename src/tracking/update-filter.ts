/**
 * Update Filter
 *
 * Filters update check results to extract updatable files
 */

import { UpdateStatus, type UpdateCheckResult } from './update-checker.js';

/** Skip reason for files that cannot be updated - @internal Internal type - not exported */
type SkipReason = 'up-to-date' | 'local-edit' | 'conflict' | 'local-deleted' | 'remote-deleted' | 'error';

/** Skipped file information - @internal Internal type - not exported */
interface SkippedFile {
  result: UpdateCheckResult;
  reason: SkipReason;
}

/** Filter result - @internal Internal type - not exported */
interface FilterResult {
  updatable: UpdateCheckResult[];
  skipped: SkippedFile[];
}

/**
 * Filter options
 */
export interface FilterOptions {
  /** Force update even if there are local edits (conflicts) */
  force?: boolean;
}

/**
 * Filter updatable files from update check results
 *
 * @param results - Update check results
 * @param options - Filter options
 * @returns Filtered results with updatable and skipped files
 */
export function filterUpdatableFiles(
  results: UpdateCheckResult[],
  options: FilterOptions = {}
): FilterResult {
  const { force = false } = options;

  const updatable: UpdateCheckResult[] = [];
  const skipped: SkippedFile[] = [];

  for (const result of results) {
    // Determine skip reason based on status
    const skipInfo = getSkipReason(result, force);

    if (skipInfo) {
      skipped.push({
        result,
        reason: skipInfo,
      });
    } else {
      updatable.push(result);
    }
  }

  return { updatable, skipped };
}

/**
 * Get skip reason for a file, or null if file is updatable
 *
 * @param result - Update check result
 * @param force - Force update flag
 * @returns Skip reason or null if updatable
 */
function getSkipReason(result: UpdateCheckResult, force: boolean): SkipReason | null {
  switch (result.status) {
    case UpdateStatus.UP_TO_DATE:
      return 'up-to-date';

    case UpdateStatus.LOCAL_EDITED:
      return 'local-edit';

    case UpdateStatus.CONFLICT:
      // With force option, conflicts can be updated
      return force ? null : 'conflict';

    case UpdateStatus.LOCAL_DELETED:
      return 'local-deleted';

    case UpdateStatus.REMOTE_DELETED:
      return 'remote-deleted';

    case UpdateStatus.ERROR:
      return 'error';

    case UpdateStatus.REMOTE_UPDATED:
      // Remote updated files can be updated
      return null;

    default:
      // Unknown status - skip by default
      return 'error';
  }
}
