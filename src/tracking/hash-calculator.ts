/**
 * Hash Calculator
 *
 * Handles SHA-256 hash calculation for file content tracking
 */

import crypto from 'crypto';
import { promises as fs } from 'fs';

/**
 * Hash calculation error types
 */
export enum HashErrorType {
  FILE_NOT_FOUND = 'FILE_NOT_FOUND',
  READ_ERROR = 'READ_ERROR',
}

/**
 * Hash calculation error
 */
export class HashError extends Error {
  constructor(
    public readonly code: HashErrorType,
    message: string,
    public readonly details?: string
  ) {
    super(message);
    this.name = 'HashError';
  }
}

/**
 * Calculate SHA-256 hash of content
 *
 * @param content - String content to hash
 * @returns 64-character hexadecimal hash string
 */
export function calculateHash(content: string): string {
  return crypto.createHash('sha256').update(content, 'utf-8').digest('hex');
}

/**
 * Calculate SHA-256 hash of file content
 *
 * @param filePath - Absolute path to the file
 * @returns 64-character hexadecimal hash string
 * @throws {HashError} If file does not exist or cannot be read
 */
export async function calculateFileHash(filePath: string): Promise<string> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return calculateHash(content);
  } catch (error) {
    if (error instanceof Error && 'code' in error) {
      const nodeError = error as NodeJS.ErrnoException;

      if (nodeError.code === 'ENOENT') {
        throw new HashError(
          HashErrorType.FILE_NOT_FOUND,
          `File not found: ${filePath}`,
          nodeError.message
        );
      }

      if (nodeError.code === 'EACCES' || nodeError.code === 'EPERM' || nodeError.code === 'EISDIR') {
        throw new HashError(
          HashErrorType.READ_ERROR,
          `Failed to read file: ${filePath}`,
          nodeError.message
        );
      }
    }

    throw new HashError(
      HashErrorType.READ_ERROR,
      `Failed to read file: ${filePath}`,
      error instanceof Error ? error.message : String(error)
    );
  }
}
