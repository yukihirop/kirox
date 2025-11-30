import { promises as fs, constants } from 'fs';
import path from 'path';
import { confirm } from './prompt.js';
import type { WriteOptions, WriteResult } from './types.js';

export async function ensureDirectory(dirPath: string): Promise<void> {
  const normalizedPath = path.normalize(dirPath);

  try {
    await fs.access(normalizedPath, constants.F_OK);
  } catch (_error) {
    try {
      await fs.mkdir(normalizedPath, { recursive: true });
    } catch (mkdirError) {
      if (mkdirError instanceof Error) {
        const fsError = mkdirError as NodeJS.ErrnoException;

        if (fsError.code === 'ENOSPC' || fsError.code === 'EACCES') {
          throw new Error(
            `Disk space error: ${fsError.message}. Free up space and retry.`
          );
        }

        throw mkdirError;
      }
      throw new Error(`Failed to create directory: ${normalizedPath}`);
    }
  }
}

export async function checkFileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

export async function writeFile(
  filePath: string,
  content: string,
  options: WriteOptions
): Promise<WriteResult> {
  const { force, prompt: shouldPrompt, dryRun } = options;

  const size = Buffer.byteLength(content, 'utf-8');

  if (dryRun) {
    return {
      written: false,
      skipped: true,
      reason: 'Skipped due to dry-run mode',
      filePath,
      size,
    };
  }

  const fileExists = await checkFileExists(filePath);

  if (fileExists && shouldPrompt && !force) {
    const shouldOverwrite = await confirm(`⚠️  File '${filePath}' already exists. Overwrite?`);

    if (!shouldOverwrite) {
      return {
        written: false,
        skipped: true,
        reason: 'User declined to overwrite existing file',
        filePath,
      };
    }
  }

  const directory = path.dirname(filePath);
  await ensureDirectory(directory);

  try {
    await fs.writeFile(filePath, content, 'utf-8');

    return {
      written: true,
      skipped: false,
      filePath,
      size,
    };
  } catch (error) {
    if (error instanceof Error) {
      const fsError = error as NodeJS.ErrnoException;

      if (fsError.code === 'ENOSPC' || fsError.code === 'EACCES') {
        throw new Error(
          `Disk space error: ${fsError.message}. Free up space and retry.`
        );
      }

      throw error;
    }
    throw new Error(`Failed to write file: ${filePath}`);
  }
}
