import { calculateFileHash, HashError, HashErrorType } from './hash-calculator.js';

export enum EditStatus {
  NO_EDIT = 'NO_EDIT',
  EDITED = 'EDITED',
  DELETED = 'DELETED',
  UNKNOWN = 'UNKNOWN',
}

interface EditDetectionResult {
  status: EditStatus;
  currentHash?: string;
  recordedHash: string;
  message: string;
  error?: string;
}

export async function detectLocalEdit(
  filePath: string,
  recordedHash: string
): Promise<EditDetectionResult> {
  try {
    const currentHash = await calculateFileHash(filePath);

    if (currentHash === recordedHash) {
      return {
        status: EditStatus.NO_EDIT,
        currentHash,
        recordedHash,
        message: 'File not edited',
      };
    } else {
      return {
        status: EditStatus.EDITED,
        currentHash,
        recordedHash,
        message: 'Local edits detected',
      };
    }
  } catch (error) {
    if (error instanceof HashError) {
      if (error.code === HashErrorType.FILE_NOT_FOUND || error.code === HashErrorType.READ_ERROR) {
        if (error.details?.includes('EISDIR') || error.code === HashErrorType.FILE_NOT_FOUND) {
          return {
            status: EditStatus.DELETED,
            recordedHash,
            message: 'File deleted',
          };
        }

        return {
          status: EditStatus.UNKNOWN,
          recordedHash,
          message: 'File status unknown (hash calculation failed)',
          error: error.details || error.message,
        };
      }
    }

    return {
      status: EditStatus.UNKNOWN,
      recordedHash,
      message: 'File status unknown (hash calculation failed)',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
