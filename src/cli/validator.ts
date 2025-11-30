import type { ParsedArguments, ValidationResult, ValidationError } from './types.js';
import { normalizeSubdirPath, validateSubdirPath } from '@/filesystem/path-utils.js';

const REPOSITORY_PATTERN = /^[a-zA-Z0-9._-]+\/[a-zA-Z0-9._-]+(?:#[a-zA-Z0-9._/-]+)?$/;

const CONTROL_CHARS_PATTERN = /[\x00-\x1F\x7F]/;

export function validateInput(args: ParsedArguments): ValidationResult {
  const errors: ValidationError[] = [];

  if (args.steering && (args.checkUpdates || args.update)) {
    const activeNames: string[] = ['--steering'];
    if (args.checkUpdates) activeNames.push('--check-updates');
    if (args.update) activeNames.push('--update');

    errors.push({
      field: 'options',
      message: `Options ${activeNames.join(', ')} are mutually exclusive. Use only one at a time.`,
    });
  }

  if (args.track && (args.checkUpdates || args.update)) {
    const activeNames: string[] = ['--track'];
    if (args.checkUpdates) activeNames.push('--check-updates');
    if (args.update) activeNames.push('--update');

    errors.push({
      field: 'options',
      message: `Options ${activeNames.join(', ')} are mutually exclusive. Use only one at a time.`,
    });
  }

  if (args.checkUpdates && args.update) {
    errors.push({
      field: 'options',
      message: `Options --check-updates, --update are mutually exclusive. Use only one at a time.`,
    });
  }

  const requiresRepository = !args.checkUpdates && !args.update;
  const requiresProject = requiresRepository && !args.steering;

  if (requiresRepository) {
    
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
    
    if (args.projects.length > 0) {
      
      for (const project of args.projects) {
        errors.push(...validateProjectName(project));
      }

    } else {
      errors.push({
        field: 'project',
        message: 'Project name cannot be empty',
      });
    }
  }

  if (args.subdir !== undefined) {
    try {
      
      validateSubdirPath(args.subdir);
      
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

export function validateProjectName(project: string): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!project || project.trim() === '') {
    errors.push({
      field: 'project',
      message: 'Project name cannot be empty',
    });
    return errors;
  }

  if (project.includes('..')) {
    errors.push({
      field: 'project',
      message: 'Project name cannot contain ".." (path traversal attempt)',
    });
    return errors;
  }

  if (project.includes('/') || project.includes('\\')) {
    errors.push({
      field: 'project',
      message: 'Project name cannot contain path separators ("/" or "\\")',
    });
    return errors;
  }

  return errors;
}

export function validateBranchName(
  branch: string | undefined
): ValidationError[] {
  const errors: ValidationError[] = [];

  if (branch === undefined || branch === '') {
    return errors;
  }

  if (CONTROL_CHARS_PATTERN.test(branch)) {
    errors.push({
      field: 'branch',
      message: `無効なブランチ名です: ${branch}`,
    });
    return errors;
  }

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
