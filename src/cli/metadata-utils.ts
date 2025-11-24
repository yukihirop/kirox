/**
 * Metadata Utilities
 *
 * Centralized utilities for metadata operations
 * Extracted from entry.ts and add-command-entry.ts to eliminate duplication
 */

import path from 'path';
import type { Metadata } from '../tracking/types.js';

/**
 * Get metadata file path based on output directory
 *
 * @param outputDir - Output directory from args
 * @returns Metadata file path
 */
export function getMetadataPath(outputDir: string): string {
  return path.join(outputDir, '.kiro', '.kirox-meta.json');
}

/**
 * Check if a project with the same repository, projectName, and subdir exists in metadata
 *
 * Business requirement: Duplicate projects are allowed in different subdirectories
 * - Same repository + projectName + subdir = duplicate
 * - Different subdir = separate project
 *
 * @param metadata - Existing metadata
 * @param repository - Repository to check
 * @param projectName - Project name to check
 * @param subdir - Optional subdirectory to check
 * @returns True if duplicate exists, false otherwise
 */
export function isDuplicateProject(
  metadata: Metadata,
  repository: string,
  projectName: string,
  subdir?: string
): boolean {
  return metadata.projects.some(
    (project) =>
      project.repository === repository &&
      project.projectName === projectName &&
      project.subdir === subdir
  );
}
