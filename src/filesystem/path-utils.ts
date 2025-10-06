/**
 * Path Conversion and Validation Utilities
 *
 * Provides utilities for converting between remote repository paths and local file system paths,
 * with built-in security validation to prevent path traversal attacks.
 */

import path from 'path';

/**
 * Validate project name for security (prevent path traversal attacks)
 *
 * Ensures project names don't contain path traversal sequences (..) or path separators,
 * which could be used to access files outside the intended directory.
 *
 * @param projectName - Project name to validate
 * @returns true if valid, false otherwise
 *
 * @example
 * ```typescript
 * isValidProjectName('my-project')     // true
 * isValidProjectName('../etc')         // false (path traversal)
 * isValidProjectName('project/name')   // false (path separator)
 * ```
 */
export function isValidProjectName(projectName: string): boolean {
  if (!projectName || typeof projectName !== 'string') {
    return false;
  }

  const trimmed = projectName.trim();

  // Empty or whitespace-only
  if (trimmed.length === 0) {
    return false;
  }

  // Check for path traversal attempts
  if (trimmed.includes('..')) {
    return false;
  }

  // Check for path separators
  if (trimmed.includes('/') || trimmed.includes('\\')) {
    return false;
  }

  return true;
}

/**
 * Get spec directory path for a project
 *
 * @param projectName - Project name
 * @returns Spec directory path (.kiro/specs/<project>)
 * @throws Error if project name is invalid
 */
export function getSpecDirectoryPath(projectName: string): string {
  if (!isValidProjectName(projectName)) {
    throw new Error(
      `Invalid project name: "${projectName}". Project name must not contain path traversal or separators.`
    );
  }

  return `.kiro/specs/${projectName}`;
}

/**
 * Get steering directory path
 *
 * @returns Steering directory path (.kiro/steering)
 */
export function getSteeringDirectoryPath(): string {
  return '.kiro/steering';
}

/**
 * Convert remote repository path to local file system path
 *
 * @param remotePath - Path in remote repository
 * @returns Local file system path
 * @throws Error if path is invalid or outside .kiro directory
 */
export function convertRemoteToLocalPath(remotePath: string): string {
  if (!remotePath || typeof remotePath !== 'string') {
    throw new Error('Remote path must be a non-empty string');
  }

  // Normalize path (convert backslashes, remove extra slashes)
  const normalized = path.normalize(remotePath).replace(/\\/g, '/');

  // Check for path traversal attempts
  if (normalized.includes('..')) {
    throw new Error('Invalid path: contains path traversal');
  }

  // Must start with .kiro/
  if (!normalized.startsWith('.kiro/')) {
    throw new Error('Path must be within .kiro directory');
  }

  // Remove duplicate slashes
  const cleaned = normalized.replace(/\/+/g, '/');

  return cleaned;
}

/**
 * Resolve output path by combining output directory with remote path
 *
 * Supports both relative and absolute output directory paths.
 * The remote path is appended to the output directory.
 *
 * @param outputDir - Output directory (e.g., '.', './specs', '/absolute/path')
 * @param remotePath - Path in remote repository (e.g., '.kiro/specs/project/file.md')
 * @returns Resolved absolute local file path
 * @throws Error if paths are invalid
 *
 * @example
 * ```typescript
 * resolveOutputPath('.', '.kiro/specs/myapp/requirements.md')
 * // Returns: '/current/dir/.kiro/specs/myapp/requirements.md'
 *
 * resolveOutputPath('./external', '.kiro/specs/myapp/requirements.md')
 * // Returns: '/current/dir/external/.kiro/specs/myapp/requirements.md'
 *
 * resolveOutputPath('/tmp/test', '.kiro/steering/tech.md')
 * // Returns: '/tmp/test/.kiro/steering/tech.md'
 * ```
 */
export function resolveOutputPath(
  outputDir: string,
  remotePath: string
): string {
  if (!outputDir || typeof outputDir !== 'string') {
    throw new Error('Output directory must be a non-empty string');
  }

  // Validate and normalize remote path
  const normalizedRemotePath = convertRemoteToLocalPath(remotePath);

  // Resolve output directory to absolute path
  // path.resolve handles both relative and absolute paths
  const absoluteOutputDir = path.resolve(outputDir);

  // Combine output directory with remote path
  const fullPath = path.join(absoluteOutputDir, normalizedRemotePath);

  // Normalize and return
  return path.normalize(fullPath);
}
