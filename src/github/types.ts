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

// File content retrieved from GitHub - Commented out - reserved for future use
// interface FileContent {
//   path: string;
//   content: string;
//   size: number;
// }

// Error occurred during file fetch - Commented out - reserved for future use
// interface FetchError {
//   path: string;
//   error: Error;
//   retryable: boolean;
// }
