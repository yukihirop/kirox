/**
 * File Updater
 *
 * Updates a single file by fetching latest content from GitHub
 */

import { promises as fs } from 'fs';
import path from 'path';
import type { Octokit } from 'octokit';
import { calculateFileHash } from './hash-calculator.js';
import type { FileMetadata } from './types.js';

/**
 * Update result for a single file
 */
export interface UpdateResult {
  /** Whether the update was successful */
  success: boolean;
  /** Original SHA before update */
  oldSha: string;
  /** New SHA after update (if successful) */
  newSha?: string;
  /** New hash after update (if successful) */
  newHash?: string;
  /** New file size after update (if successful) */
  newSize?: number;
  /** Updated metadata (if successful) */
  updatedMetadata?: FileMetadata;
  /** Error message (if failed) */
  error?: string;
}

/**
 * Update a single file by fetching latest content from GitHub
 *
 * @param client - Octokit client instance
 * @param owner - Repository owner
 * @param repo - Repository name
 * @param localPath - Local file path to update
 * @param fileMetadata - Current file metadata
 * @returns Update result with new metadata or error
 */
export async function updateFile(
  client: Octokit,
  owner: string,
  repo: string,
  localPath: string,
  fileMetadata: FileMetadata
): Promise<UpdateResult> {
  const oldSha = fileMetadata.sha;

  try {
    // 1. Fetch latest content from GitHub
    const response = await client.rest.repos.getContent({
      owner,
      repo,
      path: fileMetadata.path,
    });

    // Validate response is a file (not directory or array)
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
        error: `ファイルではなくディレクトリまたは不明な型です: ${response.data.type}`,
      };
    }

    const { sha: newSha, size: newSize, content, encoding } = response.data;

    // Validate content is base64 encoded
    if (encoding !== 'base64' || !content) {
      return {
        success: false,
        oldSha,
        error: 'コンテンツがbase64エンコードされていません',
      };
    }

    // 2. Decode content
    const decodedContent = Buffer.from(content, 'base64').toString('utf-8');

    // 3. Write to file system
    // Create directory if it doesn't exist
    const dirPath = path.dirname(localPath);
    await fs.mkdir(dirPath, { recursive: true });

    // Write file
    await fs.writeFile(localPath, decodedContent, 'utf-8');

    // 4. Calculate new hash
    const newHash = await calculateFileHash(localPath);

    // 5. Create updated metadata
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
    // Handle errors
    const errorMessage = error instanceof Error ? error.message : String(error);

    return {
      success: false,
      oldSha,
      error: errorMessage,
    };
  }
}
