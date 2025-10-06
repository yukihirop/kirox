/**
 * File System Layer Type Definitions
 */

/**
 * Write options for file writing
 */
export interface WriteOptions {
  force: boolean; // Skip overwrite confirmation
  prompt: boolean; // Show overwrite prompt
  dryRun: boolean; // Don't actually write files
  verbose: boolean; // Verbose logging
}

/**
 * Write result indicating what happened
 */
export interface WriteResult {
  written: boolean; // File was written
  skipped: boolean; // File was skipped
  reason?: string; // Reason for skip or failure
  filePath?: string; // Path to the file
  size?: number; // File size in bytes (for dry-run or verbose mode)
}
