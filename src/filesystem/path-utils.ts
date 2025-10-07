/**
 * Path Conversion and Validation Utilities
 *
 * Provides utilities for converting between remote repository paths and local file system paths,
 * with built-in security validation to prevent path traversal attacks.
 */

import path from 'path';

/**
 * Normalize subdirectory path for .kiro folder location
 *
 * Removes leading/trailing slashes, converts backslashes to forward slashes,
 * normalizes consecutive slashes, and handles root directory cases.
 *
 * @param subdirPath - User input subdirectory path
 * @returns Normalized path (empty string indicates root directory)
 *
 * @example
 * ```typescript
 * normalizeSubdirPath('/packages/api/')    // 'packages/api'
 * normalizeSubdirPath('./services/auth')   // 'services/auth'
 * normalizeSubdirPath('packages\\api')     // 'packages/api'
 * normalizeSubdirPath('.')                 // ''
 * normalizeSubdirPath('')                  // ''
 * ```
 */
export function normalizeSubdirPath(subdirPath: string): string {
  if (!subdirPath || typeof subdirPath !== 'string') {
    return '';
  }

  let normalized = subdirPath.trim();

  // Convert backslashes to forward slashes first
  normalized = normalized.replace(/\\/g, '/');

  // Remove leading / or ./
  normalized = normalized.replace(/^\/+/, '').replace(/^\.\//, '');

  // Normalize consecutive slashes to single slash
  normalized = normalized.replace(/\/+/g, '/');

  // Remove trailing /
  normalized = normalized.replace(/\/+$/, '');

  // Return empty string for . or empty string (root directory)
  if (normalized === '.' || normalized === '') {
    return '';
  }

  return normalized;
}

/**
 * Validate subdirectory path for security
 *
 * Ensures subdirectory paths don't contain path traversal sequences (..) or absolute paths,
 * which could be used to access files outside the intended directory.
 *
 * @param subdirPath - Normalized subdirectory path to validate
 * @throws Error if path contains path traversal or is absolute
 *
 * @example
 * ```typescript
 * validateSubdirPath('packages/api')    // No throw (valid)
 * validateSubdirPath('')                // No throw (root directory)
 * validateSubdirPath('../etc')          // Throws error (path traversal)
 * validateSubdirPath('/etc/passwd')     // Throws error (absolute path)
 * ```
 */
export function validateSubdirPath(subdirPath: string): void {
  // Empty string is valid (indicates root directory)
  if (subdirPath === '') {
    return;
  }

  // Check for path traversal attempts
  if (subdirPath.includes('..')) {
    throw new Error(
      `サブディレクトリパスにパストラバーサル (..) は使用できません: ${subdirPath}`
    );
  }

  // Check for absolute paths (Unix-style and Windows-style)
  if (path.isAbsolute(subdirPath)) {
    throw new Error(
      `サブディレクトリパスに絶対パスは使用できません: ${subdirPath}`
    );
  }

  // Check for Windows-style absolute paths (C:/, D:/, etc.)
  // path.isAbsolute() may not detect these on non-Windows platforms
  if (/^[a-zA-Z]:[\\/]/.test(subdirPath)) {
    throw new Error(
      `サブディレクトリパスに絶対パスは使用できません: ${subdirPath}`
    );
  }
}

/**
 * Build remote path from subdirectory and project name
 *
 * Constructs the remote repository path for fetching .kiro files.
 * Supports both specs and steering directories, with or without subdirectories.
 *
 * @param subdir - Normalized subdirectory path (empty string indicates root)
 * @param projectName - Project name (required for specs, ignored for steering)
 * @param type - Type of directory: "specs" or "steering"
 * @returns Remote path (e.g., "packages/api/.kiro/specs/my-project")
 * @throws Error if project name is invalid for specs type
 *
 * @example
 * ```typescript
 * buildRemotePath('packages/api', 'my-project', 'specs')
 * // Returns: 'packages/api/.kiro/specs/my-project'
 *
 * buildRemotePath('', 'my-project', 'specs')
 * // Returns: '.kiro/specs/my-project'
 *
 * buildRemotePath('packages/api', '', 'steering')
 * // Returns: 'packages/api/.kiro/steering'
 *
 * buildRemotePath('', '', 'steering')
 * // Returns: '.kiro/steering'
 * ```
 */
export function buildRemotePath(
  subdir: string,
  projectName: string,
  type: 'specs' | 'steering'
): string {
  const kiroBase = subdir ? `${subdir}/.kiro` : '.kiro';

  if (type === 'specs') {
    if (!isValidProjectName(projectName)) {
      throw new Error(`無効なプロジェクト名です: "${projectName}"`);
    }
    return `${kiroBase}/specs/${projectName}`;
  } else {
    return `${kiroBase}/steering`;
  }
}

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
 * @deprecated Use buildRemotePath(subdir, projectName, 'specs') instead
 * @param projectName - Project name
 * @returns Spec directory path (.kiro/specs/<project>)
 * @throws Error if project name is invalid
 */
export function getSpecDirectoryPath(projectName: string): string {
  return buildRemotePath('', projectName, 'specs');
}

/**
 * Get steering directory path
 *
 * @deprecated Use buildRemotePath(subdir, '', 'steering') instead
 * @returns Steering directory path (.kiro/steering)
 */
export function getSteeringDirectoryPath(): string {
  return buildRemotePath('', '', 'steering');
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

  // Must contain .kiro/ (can be at start or after a subdirectory)
  if (!normalized.includes('.kiro/')) {
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
 * The remote path is appended to the output directory, with subdirectory
 * prefixes stripped to ensure local paths always use <outputDir>/.kiro/...
 *
 * @param outputDir - Output directory (e.g., '.', './specs', '/absolute/path')
 * @param remotePath - Path in remote repository (e.g., '.kiro/specs/project/file.md' or 'lib/a/.kiro/specs/project/file.md')
 * @returns Resolved absolute local file path
 * @throws Error if paths are invalid
 *
 * @example
 * ```typescript
 * resolveOutputPath('.', '.kiro/specs/myapp/requirements.md')
 * // Returns: '/current/dir/.kiro/specs/myapp/requirements.md'
 *
 * resolveOutputPath('./tmp', 'lib/a/.kiro/specs/myapp/requirements.md')
 * // Returns: '/current/dir/tmp/.kiro/specs/myapp/requirements.md' (subdirectory stripped)
 *
 * resolveOutputPath('/tmp/test', 'packages/api/.kiro/steering/tech.md')
 * // Returns: '/tmp/test/.kiro/steering/tech.md' (subdirectory stripped)
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

  // Strip subdirectory prefix from remote path
  // Remote path may be: "lib/a/.kiro/specs/project/file.md"
  // We want to extract: ".kiro/specs/project/file.md"
  const kiroIndex = normalizedRemotePath.indexOf('.kiro/');
  if (kiroIndex === -1) {
    throw new Error('Path must contain .kiro/ directory');
  }

  // Extract path starting from .kiro/
  const pathWithoutSubdir = normalizedRemotePath.substring(kiroIndex);

  // Resolve output directory to absolute path
  // path.resolve handles both relative and absolute paths
  const absoluteOutputDir = path.resolve(outputDir);

  // Combine output directory with stripped remote path
  const fullPath = path.join(absoluteOutputDir, pathWithoutSubdir);

  // Normalize and return
  return path.normalize(fullPath);
}
