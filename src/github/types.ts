/**
 * GitHub Integration Layer Type Definitions
 */

/**
 * Rate limit information from GitHub API
 */
export interface RateLimitInfo {
  /** Remaining requests in current rate limit window */
  remaining: number;
  /** Maximum requests allowed in rate limit window */
  limit: number;
  /** Timestamp when rate limit resets */
  resetAt: Date;
}

/**
 * File content retrieved from GitHub
 */
export interface FileContent {
  /** File path in repository */
  path: string;
  /** Decoded file content (UTF-8) */
  content: string;
  /** File size in bytes */
  size: number;
}

/**
 * Error occurred during file fetch
 */
export interface FetchError {
  /** File path that failed to fetch */
  path: string;
  /** Error details */
  error: Error;
  /** Whether this error is retryable */
  retryable: boolean;
}

/**
 * Result of fetching repository files
 */
export interface FetchResult {
  /** Successfully fetched files */
  files: FileContent[];
  /** Errors encountered during fetch */
  errors: FetchError[];
}
