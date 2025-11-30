import { promises as fs } from 'fs';
import path from 'path';
import type { Octokit } from 'octokit';
import { calculateFileHash } from './hash-calculator.js';
import type { FileMetadata } from './types.js';

export interface UpdateResult {
  success: boolean;
  oldSha: string;
  newSha?: string;
  newHash?: string;
  newSize?: number;
  updatedMetadata?: FileMetadata;
  error?: string;
}

export async function updateFile(
  client: Octokit,
  owner: string,
  repo: string,
  localPath: string,
  fileMetadata: FileMetadata
): Promise<UpdateResult> {
  const oldSha = fileMetadata.sha;

  try {
    const response = await client.rest.repos.getContent({
      owner,
      repo,
      path: fileMetadata.path,
    });

    if (Array.isArray(response.data)) {
      return {
        success: false,
        oldSha,
        error: 'APIレスポンスが配列です（ディレクトリの可能性があります）',
      };
    }

    if (response.data.type !== 'file') {
      return {
        success: false,
        oldSha,
        error: `Not a file, but directory or unknown type: ${response.data.type}`,
      };
    }

    const { sha: newSha, size: newSize, content, encoding } = response.data;

    if (encoding !== 'base64' || !content) {
      return {
        success: false,
        oldSha,
        error: 'コンテンツがbase64エンコードされていません',
      };
    }

    const decodedContent = Buffer.from(content, 'base64').toString('utf-8');

    const dirPath = path.dirname(localPath);
    await fs.mkdir(dirPath, { recursive: true });

    await fs.writeFile(localPath, decodedContent, 'utf-8');

    const newHash = await calculateFileHash(localPath);

    const updatedMetadata: FileMetadata = {
      path: fileMetadata.path,
      sha: newSha,
      size: newSize,
      localHash: newHash,
      fetchedAt: new Date().toISOString(),
    };

    return {
      success: true,
      oldSha,
      newSha,
      newHash,
      newSize,
      updatedMetadata,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    return {
      success: false,
      oldSha,
      error: errorMessage,
    };
  }
}
