/**
 * File Writer
 *
 * Handles writing files to local file system with directory creation
 */

import { promises as fs, constants } from 'fs';
import path from 'path';

/**
 * Ensure directory exists, create if it doesn't exist
 *
 * This function checks if a directory exists and creates it (including parent directories)
 * if it doesn't. Uses recursive directory creation to handle nested paths.
 *
 * @param dirPath - Directory path to ensure exists
 * @returns Promise that resolves when directory is ensured to exist
 * @throws Error if directory creation fails (e.g., permission denied, disk full)
 *
 * @example
 * ```typescript
 * await ensureDirectory('.kiro/specs/my-project');
 * // Directory is now guaranteed to exist
 * ```
 */
export async function ensureDirectory(dirPath: string): Promise<void> {
  // Normalize path separators (handles both Windows and Unix paths)
  const normalizedPath = path.normalize(dirPath);

  try {
    // Check if directory exists
    await fs.access(normalizedPath, constants.F_OK);
    // Directory exists, no need to create
  } catch (error) {
    // Directory does not exist, create it recursively
    try {
      await fs.mkdir(normalizedPath, { recursive: true });
    } catch (mkdirError) {
      // Re-throw with more context for better debugging
      if (mkdirError instanceof Error) {
        throw mkdirError;
      }
      throw new Error(`Failed to create directory: ${normalizedPath}`);
    }
  }
}
