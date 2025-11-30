import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import type { KiroxConfig } from './types.js';
import { validateBranchName } from '@/cli/validator.js';

export async function loadConfig(customPath?: string): Promise<KiroxConfig> {
  if (customPath) {
    return await loadConfigFile(customPath, true);
  }

  const currentDirConfig = path.join(process.cwd(), '.kiroxrc.json');
  try {
    return await loadConfigFile(currentDirConfig, false);
  } catch (error) {
    if (!isFileNotFoundError(error)) {
      throw error;
    }
  }

  const homeDirConfig = path.join(os.homedir(), '.kiroxrc.json');
  try {
    return await loadConfigFile(homeDirConfig, false);
  } catch (error) {
    if (!isFileNotFoundError(error)) {
      throw error;
    }
  }

  return {};
}

async function loadConfigFile(filePath: string, required: boolean): Promise<KiroxConfig> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const config = JSON.parse(content) as KiroxConfig;

    if (config.branch !== undefined) {
      const branchErrors = validateBranchName(config.branch);
      if (branchErrors.length > 0) {
        throw new Error(`Invalid branch name in config file: ${config.branch}`);
      }
    }

    if (config.project !== undefined) {
      if (typeof config.project !== 'string' && !Array.isArray(config.project)) {
        throw new Error('Invalid project value in config file');
      }

      if (Array.isArray(config.project)) {
        if (config.project.length === 0) {
          throw new Error('Empty project array in config file');
        }

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
        throw error;
      }
      throw new Error(`Failed to load config from ${filePath}: ${error.message}`);
    }
    throw error;
  }
}

function isFileNotFoundError(error: unknown): boolean {
  return error instanceof Error && 'code' in error && error.code === 'ENOENT';
}
