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

  // Check mutual exclusivity of mode options
  // Note: --steering + --track is allowed (Requirement 6.3), but other combinations are mutually exclusive
  // Task 2.2: Update mutual exclusivity validation for --steering mode

  // Check if --steering is combined with --check-updates or --update (Requirement 6.4)
  if (args.steering && (args.checkUpdates || args.update)) {
    const activeNames: string[] = ['--steering'];
    if (args.checkUpdates) activeNames.push('--check-updates');
    if (args.update) activeNames.push('--update');

    errors.push({
      field: 'options',
      message: `Options ${activeNames.join(', ')} are mutually exclusive. Use only one at a time.`,
    });
  }

  // Check if --track is combined with --check-updates or --update
  if (args.track && (args.checkUpdates || args.update)) {
    const activeNames: string[] = ['--track'];
    if (args.checkUpdates) activeNames.push('--check-updates');
    if (args.update) activeNames.push('--update');

    errors.push({
      field: 'options',
      message: `Options ${activeNames.join(', ')} are mutually exclusive. Use only one at a time.`,
    });
  }

  // Check if --check-updates and --update are used together
  if (args.checkUpdates && args.update) {
    errors.push({
      field: 'options',
      message: `Options --check-updates, --update are mutually exclusive. Use only one at a time.`,
    });
  }

  // For --check-updates and --update, repository and project are both optional
  // For --steering mode, repository is required but project is optional
  const requiresRepository = !args.checkUpdates && !args.update;
  const requiresProject = requiresRepository && !args.steering;

  if (requiresRepository) {
    // Validate repository format using individual validation function
    if (args.repository) {
      errors.push(...validateRepositoryFormat(args.repository));
    } else {
      errors.push({
        field: 'repository',
        message: 'Repository must be in format "owner/repo" (e.g., "facebook/react")',
      });
    }
  }

  if (requiresProject) {
    // Validate project name(s) using individual validation function
    // For backward compatibility, check if projects array is empty
    if (args.projects.length > 0) {
      // Validate each project name in the array
      for (const project of args.projects) {
        errors.push(...validateProjectName(project));
      }

      // Task 4.1: Check for duplicate project names
      // validateProjectDuplicates is commented out - reserved for future use
      // errors.push(...validateProjectDuplicates(args.projects));
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
 * Validate project names for duplicates
 *
 * Task 4.1: Multi-project validation - duplicate detection
 *
 * @param projects - Array of project names to check for duplicates
 * @returns Array of validation errors (empty if no duplicates found)
 * @internal Commented out - reserved for future use
 */
/* export function validateProjectDuplicates(
  projects: string[]
): ValidationError[] {
  const errors: ValidationError[] = [];

  // Count occurrences of each project name
  const projectCounts = new Map<string, number>();
  for (const project of projects) {
    const count = projectCounts.get(project) || 0;
    projectCounts.set(project, count + 1);
  }

  // Find duplicates
  const duplicates: string[] = [];
  for (const [project, count] of projectCounts.entries()) {
    if (count > 1) {
      duplicates.push(project);
    }
  }

  // Report error if duplicates found
  if (duplicates.length > 0) {
    errors.push({
      field: 'projects',
      message: `Duplicate project names found: ${duplicates.join(', ')}`,
    });
  }

  return errors;
} */

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
