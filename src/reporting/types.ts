/**
 * Reporting Layer Type Definitions
 */

/**
 * Progress reporter options
 */
export interface ReporterOptions {
  verbose: boolean; // Show verbose logging
  useColor: boolean; // Use colored output (default: true)
}

/**
 * Error types for classification
 */
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

/**
 * Error result with type and formatted message
 */
export interface ErrorResult {
  type: ErrorType;
  message: string;
  exitCode: number;
  recoverable: boolean;
}

/**
 * Error context for message formatting
 */
export interface ErrorContext {
  repository?: string;
  project?: string;
  filePath?: string;
  limit?: number;
  count?: number;
  details?: string;
}
