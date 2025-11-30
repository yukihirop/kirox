import type { Octokit } from 'octokit';
import path from 'path';
import { checkFileUpdate, UpdateStatus, type UpdateCheckResult } from './update-checker.js';
import type { ProjectMetadata } from './types.js';

interface UpdateSummary {
  totalFiles: number;
  upToDate: number;
  updatable: number;
  localEdited: number;
  conflict: number;
  localDeleted: number;
  remoteDeleted: number;
  errors: number;
  files: Array<UpdateCheckResult & { path: string }>;
}

export async function checkAllFiles(
  client: Octokit,
  owner: string,
  repo: string,
  baseDir: string,
  project: ProjectMetadata
): Promise<UpdateSummary> {
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

  if (project.files.length === 0) {
    return summary;
  }

  const checkPromises = project.files.map(async (fileMetadata) => {
    const localPath = path.join(baseDir, fileMetadata.path);

    try {
      const result = await checkFileUpdate(client, owner, repo, localPath, fileMetadata);
      return { ...result, path: fileMetadata.path };
    } catch (error) {
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

  const results = await Promise.all(checkPromises);

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
