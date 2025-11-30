export interface ReporterOptions {
  verbose: boolean;
  useColor: boolean;
}

export type ErrorType =
  | 'REPOSITORY_NOT_FOUND'
  | 'PROJECT_NOT_FOUND'
  | 'NETWORK_ERROR'
  | 'RATE_LIMIT'
  | 'ACCESS_DENIED'
  | 'FILE_TOO_LARGE'
  | 'TOO_MANY_FILES'
  | 'FILESYSTEM_ERROR'
  | 'VALIDATION_ERROR'
  | 'UNKNOWN';

export interface ErrorResult {
  type: ErrorType;
  message: string;
  exitCode: number;
  recoverable: boolean;
}

export interface ErrorContext {
  repository?: string;
  project?: string;
  filePath?: string;
  limit?: number;
  count?: number;
  details?: string;
}
