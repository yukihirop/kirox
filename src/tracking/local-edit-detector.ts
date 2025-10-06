/**
 * Local Edit Detector
 *
 * Detects local file edits by comparing current hash with recorded hash
 */

import { calculateFileHash, HashError, HashErrorType } from './hash-calculator.js';

/**
 * Edit status enum
 */
export enum EditStatus {
  NO_EDIT = 'NO_EDIT', // File unchanged
  EDITED = 'EDITED', // File has been edited locally
  DELETED = 'DELETED', // File has been deleted
  UNKNOWN = 'UNKNOWN', // Hash calculation failed
}

/**
 * Local edit detection result
 */
export interface EditDetectionResult {
  /** Edit status */
  status: EditStatus;
  /** Current file hash (if available) */
  currentHash?: string;
  /** Recorded hash from metadata */
  recordedHash: string;
  /** Human-readable message */
  message: string;
  /** Error details (if status is UNKNOWN) */
  error?: string;
}

/**
 * Detect if a file has been edited locally
 *
 * @param filePath - Absolute path to the file
 * @param recordedHash - Hash value recorded in metadata
 * @returns Edit detection result
 */
export async function detectLocalEdit(
  filePath: string,
  recordedHash: string
): Promise<EditDetectionResult> {
  try {
    // Calculate current file hash
    const currentHash = await calculateFileHash(filePath);

    // Compare hashes
    if (currentHash === recordedHash) {
      return {
        status: EditStatus.NO_EDIT,
        currentHash,
        recordedHash,
        message: 'ファイルは編集なし',
      };
    } else {
      return {
        status: EditStatus.EDITED,
        currentHash,
        recordedHash,
        message: 'ローカル編集あり',
      };
    }
  } catch (error) {
    // Handle file not found or read errors
    if (error instanceof HashError) {
      if (error.code === HashErrorType.FILE_NOT_FOUND || error.code === HashErrorType.READ_ERROR) {
        // Check if it's a directory (EISDIR) or file not found
        if (error.details?.includes('EISDIR') || error.code === HashErrorType.FILE_NOT_FOUND) {
          return {
            status: EditStatus.DELETED,
            recordedHash,
            message: 'ファイルは削除済み',
          };
        }

        // Permission errors or other read errors -> UNKNOWN
        return {
          status: EditStatus.UNKNOWN,
          recordedHash,
          message: 'ファイルの状態不明（ハッシュ計算失敗）',
          error: error.details || error.message,
        };
      }
    }

    // Unexpected error -> UNKNOWN
    return {
      status: EditStatus.UNKNOWN,
      recordedHash,
      message: 'ファイルの状態不明（ハッシュ計算失敗）',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
