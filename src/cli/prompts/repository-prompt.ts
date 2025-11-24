/**
 * Repository Input Prompt
 *
 * Provides interactive prompt for repository input with validation and metadata-based suggestions
 */

import { input } from '@inquirer/prompts';
import chalk from 'chalk';
import { validateRepositoryFormat } from '../validator.js';
import type { Metadata } from '../../tracking/types.js';

/**
 * Prompt for repository input
 *
 * If a valid repository value is already provided, returns it immediately.
 * Otherwise, displays an interactive prompt with real-time validation.
 *
 * When metadata is provided, suggests the last used repository as the default value.
 *
 * @param currentValue - Current repository value (may be empty or whitespace)
 * @param metadata - Optional metadata object for suggesting last repository
 * @returns Validated repository string in format "owner/repo" or "owner/repo#branch"
 */
export async function promptRepository(
  currentValue: string,
  metadata?: Metadata
): Promise<string> {
  // Skip prompt if value is already provided (non-empty after trim)
  if (currentValue && currentValue.trim() !== '') {
    return currentValue;
  }

  // Extract default repository from metadata if available
  let defaultRepository: string | undefined;
  if (metadata && metadata.projects.length > 0) {
    // Get the last project's repository
    const lastProject = metadata.projects[metadata.projects.length - 1];
    if (lastProject) {
      defaultRepository = lastProject.repository;
    }
  }

  // Display interactive prompt with validation
  return await input({
    message:
      chalk.bold.cyan('📦 Enter GitHub repository (owner/repo or owner/repo#branch)') +
      (defaultRepository ? chalk.dim(` (default: ${defaultRepository})`) : ''),
    ...(defaultRepository && { default: defaultRepository }),
    validate: (value: string) => {
      const errors = validateRepositoryFormat(value);
      if (errors.length > 0) {
        return chalk.red(errors[0]?.message || 'Invalid repository format');
      }
      return true;
    },
  });
}
