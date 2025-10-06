/**
 * Tracking Layer Type Definitions
 */

/**
 * Metadata for a single file
 */
export interface FileMetadata {
  /** File path relative to repository root */
  path: string;
  /** GitHub SHA-1 hash from API */
  sha: string;
  /** Local SHA-256 hash of file content */
  localHash: string;
  /** File size in bytes */
  size: number;
  /** Timestamp when file was fetched */
  fetchedAt: string;
}

/**
 * Metadata for a project
 */
export interface ProjectMetadata {
  /** Repository in "owner/repo" format */
  repository: string;
  /** Project name */
  projectName: string;
  /** Timestamp when project was last fetched */
  fetchedAt: string;
  /** List of tracked files */
  files: FileMetadata[];
}

/**
 * Root metadata structure
 */
export interface Metadata {
  /** Metadata format version */
  version: string;
  /** List of tracked projects */
  projects: ProjectMetadata[];
}

/**
 * Metadata error types
 */
export enum MetadataErrorType {
  NOT_FOUND = 'METADATA_NOT_FOUND',
  INVALID_FORMAT = 'INVALID_FORMAT',
  INVALID_SCHEMA = 'INVALID_SCHEMA',
  READ_FAILED = 'READ_FAILED',
  WRITE_FAILED = 'WRITE_FAILED',
}

/**
 * Metadata error
 */
export class MetadataError extends Error {
  constructor(
    public type: MetadataErrorType,
    message: string,
    public details?: string
  ) {
    super(message);
    this.name = 'MetadataError';
  }
}
