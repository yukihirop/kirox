import path from 'path';
import type { Octokit } from 'octokit';
import { filterUpdatableFiles, type FilterOptions } from './update-filter.js';
import { updateFile, type UpdateResult } from './file-updater.js';
import type { UpdateCheckResult } from './update-checker.js';
import type { FileMetadata } from './types.js';

interface UpdatedFileInfo {
  path: string;
  oldSha: string;
  newSha: string;
  newHash: string;
  newSize: number;
}

interface SkippedFileInfo {
  path: string;
  reason: string;
}

interface FailedFileInfo {
  path: string;
  error: string;
}

interface ApplySummary {
  totalFiles: number;
  updated: number;
  skipped: number;
  failed: number;
  updatedFiles: UpdatedFileInfo[];
  skippedFiles: SkippedFileInfo[];
  failedFiles: FailedFileInfo[];
}

export async function applyUpdates(
  client: Octokit,
  owner: string,
  repo: string,
  baseDir: string,
  results: Array<UpdateCheckResult & { path: string }>,
  options: FilterOptions = {}
): Promise<ApplySummary> {
  const summary: ApplySummary = {
    totalFiles: results.length,
    updated: 0,
    skipped: 0,
    failed: 0,
    updatedFiles: [],
    skippedFiles: [],
    failedFiles: [],
  };

  if (results.length === 0) {
    return summary;
  }

  const filtered = filterUpdatableFiles(results, options);

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

  const updatePromises = filtered.updatable.map(async (result) => {
    const fileWithPath = results.find((r) => r.recordedSha === result.recordedSha);
    if (!fileWithPath) {
      return null;
    }

    const localPath = path.join(baseDir, fileWithPath.path);

    const fileMetadata: FileMetadata = {
      path: fileWithPath.path,
      sha: result.recordedSha,
      size: 0,
      localHash: result.recordedHash,
      fetchedAt: '',
    };

    try {
      const updateResult = await updateFile(client, owner, repo, localPath, fileMetadata);
      return { fileWithPath, updateResult };
    } catch (error) {
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

  const updateResults = await Promise.all(updatePromises);

  for (const updateInfo of updateResults) {
    if (!updateInfo) {
      continue;
    }

    const { fileWithPath, updateResult } = updateInfo;

    if (updateResult.success) {
      summary.updatedFiles.push({
        path: fileWithPath.path,
        oldSha: updateResult.oldSha,
        newSha: updateResult.newSha!,
        newHash: updateResult.newHash!,
        newSize: updateResult.newSize!,
      });
      summary.updated++;
    } else {
      summary.failedFiles.push({
        path: fileWithPath.path,
        error: updateResult.error || 'Unknown error',
      });
      summary.failed++;
    }
  }

  return summary;
}
