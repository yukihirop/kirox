import { UpdateStatus, type UpdateCheckResult } from './update-checker.js';

type SkipReason = 'up-to-date' | 'local-edit' | 'conflict' | 'local-deleted' | 'remote-deleted' | 'error';

interface SkippedFile {
  result: UpdateCheckResult;
  reason: SkipReason;
}

interface FilterResult {
  updatable: UpdateCheckResult[];
  skipped: SkippedFile[];
}

export interface FilterOptions {
  force?: boolean;
}

export function filterUpdatableFiles(
  results: UpdateCheckResult[],
  options: FilterOptions = {}
): FilterResult {
  const { force = false } = options;

  const updatable: UpdateCheckResult[] = [];
  const skipped: SkippedFile[] = [];

  for (const result of results) {
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

function getSkipReason(result: UpdateCheckResult, force: boolean): SkipReason | null {
  switch (result.status) {
    case UpdateStatus.UP_TO_DATE:
      return 'up-to-date';

    case UpdateStatus.LOCAL_EDITED:
      return 'local-edit';

    case UpdateStatus.CONFLICT:
      return force ? null : 'conflict';

    case UpdateStatus.LOCAL_DELETED:
      return 'local-deleted';

    case UpdateStatus.REMOTE_DELETED:
      return 'remote-deleted';

    case UpdateStatus.ERROR:
      return 'error';

    case UpdateStatus.REMOTE_UPDATED:
      return null;

    default:
      return 'error';
  }
}
