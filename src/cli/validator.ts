/**
 * Input Validator
 *
 * Validates parsed command-line arguments against business rules
 */

import type { ParsedArguments, ValidationResult, ValidationError } from './types.js';

/**
 * Regular expression for valid repository format: owner/repo
 * - Must contain exactly one slash
 * - Owner and repo names must not be empty
 * - Alphanumeric, hyphens, underscores, and dots allowed
 */
const REPOSITORY_PATTERN = /^[a-zA-Z0-9._-]+\/[a-zA-Z0-9._-]+$/;

/**
 * Validate input arguments
 *
 * @param args - Parsed arguments to validate
 * @returns Validation result with errors if any
 */
export function validateInput(args: ParsedArguments): ValidationResult {
  const errors: ValidationError[] = [];

  // Check mutual exclusivity of --track, --check-updates, and --update
  const exclusiveOptions = [args.track, args.checkUpdates, args.update];
  const activeOptionsCount = exclusiveOptions.filter(Boolean).length;

  if (activeOptionsCount > 1) {
    const activeNames: string[] = [];
    if (args.track) activeNames.push('--track');
    if (args.checkUpdates) activeNames.push('--check-updates');
    if (args.update) activeNames.push('--update');

    errors.push({
      field: 'options',
      message: `Options ${activeNames.join(', ')} are mutually exclusive. Use only one at a time.`,
    });
  }

  // For --check-updates and --update, repository and project are optional
  const requiresRepositoryAndProject = !args.checkUpdates && !args.update;

  if (requiresRepositoryAndProject) {
    // Validate repository format
    if (!args.repository || !REPOSITORY_PATTERN.test(args.repository)) {
      errors.push({
        field: 'repository',
        message: 'Repository must be in format "owner/repo" (e.g., "facebook/react")',
      });
    }

    // Validate project name
    if (!args.project || args.project.trim() === '') {
      errors.push({
        field: 'project',
        message: 'Project name cannot be empty',
      });
    } else if (args.project.includes('..')) {
      errors.push({
        field: 'project',
        message: 'Project name cannot contain ".." (path traversal attempt)',
      });
    } else if (args.project.includes('/') || args.project.includes('\\')) {
      errors.push({
        field: 'project',
        message: 'Project name cannot contain path separators ("/" or "\\")',
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
