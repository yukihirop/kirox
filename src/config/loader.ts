/**
 * Configuration File Loader
 *
 * Loads configuration from .kiroxrc.json files
 */

import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import type { KiroxConfig } from './types.js';
import { validateBranchName } from '@/cli/validator.js';

/**
 * Load configuration from file
 *
 * Search order:
 * 1. Custom path (if provided via --config option)
 * 2. Current directory (.kiroxrc.json)
 * 3. Home directory (~/.kiroxrc.json)
 *
 * @param customPath - Optional custom config file path from --config option
 * @returns Loaded configuration (empty object if no config file found)
 * @throws Error if config file exists but contains invalid JSON
 */
export async function loadConfig(customPath?: string): Promise<KiroxConfig> {
  // Priority 1: Custom path from --config option
  if (customPath) {
    return await loadConfigFile(customPath, true);
  }

  // Priority 2: Current directory
  const currentDirConfig = path.join(process.cwd(), '.kiroxrc.json');
  try {
    return await loadConfigFile(currentDirConfig, false);
  } catch (error) {
    if (!isFileNotFoundError(error)) {
      throw error; // Re-throw invalid JSON or other errors
    }
    // File doesn't exist, continue to next priority
  }

  // Priority 3: Home directory
  const homeDirConfig = path.join(os.homedir(), '.kiroxrc.json');
  try {
    return await loadConfigFile(homeDirConfig, false);
  } catch (error) {
    if (!isFileNotFoundError(error)) {
      throw error; // Re-throw invalid JSON or other errors
    }
    // File doesn't exist, return empty config
  }

  return {};
}

/**
 * Load and parse a config file
 *
 * @param filePath - Path to config file
 * @param required - Whether the file must exist
 * @returns Parsed configuration
 * @throws Error if file is required but doesn't exist, or if JSON is invalid
 */
async function loadConfigFile(filePath: string, required: boolean): Promise<KiroxConfig> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const config = JSON.parse(content) as KiroxConfig;

    // Task 4.3: Validate branch name in config file
    if (config.branch !== undefined) {
      const branchErrors = validateBranchName(config.branch);
      if (branchErrors.length > 0) {
        throw new Error(`Invalid branch name in config file: ${config.branch}`);
      }
    }

    // Task 2.2: Validate project field type in config file
    if (config.project !== undefined) {
      // Check if it's not a string or array
      if (typeof config.project !== 'string' && !Array.isArray(config.project)) {
        throw new Error('Invalid project value in config file');
      }

      // If it's an array, validate each element
      if (Array.isArray(config.project)) {
        // Check for empty array
        if (config.project.length === 0) {
          throw new Error('Empty project array in config file');
        }

        // Check if all elements are strings
        for (const item of config.project) {
          if (typeof item !== 'string') {
            throw new Error('Non-string value found in project array in config file');
          }
        }
      }
    }

    return config;
  } catch (error) {
    if (error instanceof Error) {
      if (isFileNotFoundError(error)) {
        if (required) {
          throw new Error(`Config file not found: ${filePath}`);
        }
        throw error; // Re-throw to try next priority
      }
      // Invalid JSON or other error
      throw new Error(`Failed to load config from ${filePath}: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Check if error is a file not found error (ENOENT)
 *
 * @param error - Error to check
 * @returns true if error is ENOENT
 */
function isFileNotFoundError(error: unknown): boolean {
  return error instanceof Error && 'code' in error && error.code === 'ENOENT';
}
