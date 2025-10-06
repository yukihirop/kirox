/**
 * File Writer
 *
 * Handles writing files to local file system with directory creation and overwrite confirmation
 */

import { promises as fs, constants } from 'fs';
import path from 'path';
import { confirm } from './prompt.js';
import type { WriteOptions, WriteResult } from './types.js';

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

/**
 * Check if file exists
 *
 * @param filePath - Path to file to check
 * @returns Promise resolving to true if file exists, false otherwise
 */
export async function checkFileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Write file to disk with overwrite confirmation
 *
 * Handles file writing with the following features:
 * - Checks if file exists before writing
 * - Prompts user for overwrite confirmation (if prompt option is true)
 * - Skips overwrite prompt if force option is true
 * - Supports dry-run mode (doesn't actually write)
 *
 * @param filePath - Path to file to write
 * @param content - Content to write to file
 * @param options - Write options
 * @returns Promise resolving to WriteResult indicating what happened
 * @throws Error if file write fails
 *
 * @example
 * ```typescript
 * const result = await writeFile('.kiro/specs/project/file.md', 'content', {
 *   force: false,
 *   prompt: true,
 *   dryRun: false,
 *   verbose: false
 * });
 * if (result.written) {
 *   console.log('File written successfully');
 * }
 * ```
 */
export async function writeFile(
  filePath: string,
  content: string,
  options: WriteOptions
): Promise<WriteResult> {
  const { force, prompt: shouldPrompt, dryRun } = options;

  // Dry-run mode: skip actual write
  if (dryRun) {
    return {
      written: false,
      skipped: true,
      reason: 'Skipped due to dry-run mode',
    };
  }

  // Check if file exists
  const fileExists = await checkFileExists(filePath);

  // If file exists and we should prompt (and not force), ask user
  if (fileExists && shouldPrompt && !force) {
    const shouldOverwrite = await confirm(`File '${filePath}' already exists. Overwrite?`);

    if (!shouldOverwrite) {
      return {
        written: false,
        skipped: true,
        reason: 'User declined to overwrite existing file',
      };
    }
  }

  // Write file
  try {
    await fs.writeFile(filePath, content, 'utf-8');

    return {
      written: true,
      skipped: false,
    };
  } catch (error) {
    // Re-throw to let caller handle
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(`Failed to write file: ${filePath}`);
  }
}
