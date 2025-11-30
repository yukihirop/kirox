export interface FileMetadata {
  path: string;
  sha: string;
  localHash: string;
  size: number;
  fetchedAt: string;
}

export interface ProjectMetadata {
  repository: string;
  projectName: string;
  subdir?: string;
  fetchedAt: string;
  files: FileMetadata[];
}

export interface Metadata {
  version: string;
  projects: ProjectMetadata[];
}

export enum MetadataErrorType {
  NOT_FOUND = 'METADATA_NOT_FOUND',
  INVALID_FORMAT = 'INVALID_FORMAT',
  INVALID_SCHEMA = 'INVALID_SCHEMA',
  READ_FAILED = 'READ_FAILED',
  WRITE_FAILED = 'WRITE_FAILED',
}

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
