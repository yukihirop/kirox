/**
 * Input Validator
 *
 * Validates parsed command-line arguments against business rules
 */

import type { ParsedArguments, ValidationResult, ValidationError } from './types.js';
import { normalizeSubdirPath, validateSubdirPath } from '@/filesystem/path-utils.js';

/**
 * Regular expression for valid repository format: owner/repo or owner/repo#branch
 * - Must contain exactly one slash for owner/repo separation
 * - Owner and repo names must not be empty
 * - Alphanumeric, hyphens, underscores, and dots allowed
 * - Optional branch specification with # (e.g., owner/repo#branch-name)
 * - Branch name can contain alphanumeric, hyphens, underscores, dots, and slashes
 */
const REPOSITORY_PATTERN = /^[a-zA-Z0-9._-]+\/[a-zA-Z0-9._-]+(?:#[a-zA-Z0-9._/-]+)?$/;

/**
 * Regular expression to detect control characters in branch names
 * - Matches: \0 (null), \t (tab), \n (newline), \r (carriage return), etc.
 */
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS_PATTERN = /[\x00-\x1F\x7F]/;

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
    // Validate repository format using individual validation function
    if (args.repository) {
      errors.push(...validateRepositoryFormat(args.repository));
    } else {
      errors.push({
        field: 'repository',
        message: 'Repository must be in format "owner/repo" (e.g., "facebook/react")',
      });
    }

    // Validate project name using individual validation function
    if (args.project) {
      errors.push(...validateProjectName(args.project));
    } else {
      errors.push({
        field: 'project',
        message: 'Project name cannot be empty',
      });
    }
  }

  // Validate subdirectory path (if specified)
  if (args.subdir !== undefined) {
    try {
      // Validate before normalization to catch absolute paths
      validateSubdirPath(args.subdir);
      // Also validate after normalization
      const normalized = normalizeSubdirPath(args.subdir);
      validateSubdirPath(normalized);
    } catch (error) {
      errors.push({
        field: 'subdir',
        message: error instanceof Error ? error.message : '無効なサブディレクトリパスです',
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate repository format (owner/repo or owner/repo#branch)
 *
 * Task 2.1: Individual field validation functions
 *
 * @param repository - Repository string to validate
 * @returns Array of validation errors (empty if valid)
 */
export function validateRepositoryFormat(
  repository: string
): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!repository || !REPOSITORY_PATTERN.test(repository)) {
    errors.push({
      field: 'repository',
      message: 'Repository must be in format "owner/repo" (e.g., "facebook/react")',
    });
  }

  return errors;
}

/**
 * Validate project name for security and filesystem safety
 *
 * Task 2.1: Individual field validation functions
 *
 * @param project - Project name to validate
 * @returns Array of validation errors (empty if valid)
 */
export function validateProjectName(project: string): ValidationError[] {
  const errors: ValidationError[] = [];

  // Check for empty or whitespace-only strings
  if (!project || project.trim() === '') {
    errors.push({
      field: 'project',
      message: 'Project name cannot be empty',
    });
    return errors;
  }

  // Check for path traversal attempts
  if (project.includes('..')) {
    errors.push({
      field: 'project',
      message: 'Project name cannot contain ".." (path traversal attempt)',
    });
    return errors;
  }

  // Check for path separators
  if (project.includes('/') || project.includes('\\')) {
    errors.push({
      field: 'project',
      message: 'Project name cannot contain path separators ("/" or "\\")',
    });
    return errors;
  }

  return errors;
}

/**
 * Validate branch name for control characters and whitespace issues
 *
 * Task 4.3: Branch name validation
 *
 * @param branch - Branch name to validate (undefined or empty string means default branch)
 * @returns Array of validation errors (empty if valid)
 */
export function validateBranchName(
  branch: string | undefined
): ValidationError[] {
  const errors: ValidationError[] = [];

  // undefined or empty string means default branch - valid
  if (branch === undefined || branch === '') {
    return errors;
  }

  // Check for control characters (tab, newline, null, etc.)
  if (CONTROL_CHARS_PATTERN.test(branch)) {
    errors.push({
      field: 'branch',
      message: `無効なブランチ名です: ${branch}`,
    });
    return errors;
  }

  // Check for leading or trailing whitespace
  const trimmed = branch.trim();
  if (branch !== trimmed) {
    const hasLeading = branch.startsWith(' ');
    const hasTrailing = branch.endsWith(' ');

    if (hasLeading && hasTrailing) {
      errors.push({
        field: 'branch',
        message: `ブランチ名の先頭と末尾に空白があります: "${branch}" (トリミング推奨)`,
      });
    } else if (hasLeading) {
      errors.push({
        field: 'branch',
        message: `ブランチ名の先頭に空白があります: "${branch}" (トリミング推奨)`,
      });
    } else if (hasTrailing) {
      errors.push({
        field: 'branch',
        message: `ブランチ名の末尾に空白があります: "${branch}" (トリミング推奨)`,
      });
    }
  }

  return errors;
}
