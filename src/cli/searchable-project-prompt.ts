/**
 * Searchable Project Prompt Service
 *
 * Provides search-enabled project selection UI using @inquirer/prompts search
 */

import { search } from '@inquirer/prompts';
import type { ProjectLocation } from '../github/project-location-builder.js';

/**
 * Project selection result
 */
export interface ProjectSelectionResult {
  /** Selected project names */
  projects: string[];
  /** Subdirectory path (common to all selected projects) */
  subdir: string;
}

/**
 * Prompt user to select project(s) with search functionality
 *
 * Uses @inquirer/prompts search to provide real-time filtering:
 * - Case-insensitive partial match search across displayName
 * - Filter applies to both subdirectory path and project name
 * - Empty input shows all projects
 *
 * Task 3.1: Basic single-selection search UI
 * Requirements: 2.5, 2.6
 *
 * @param projectLocations - Available project locations
 * @returns Selected project(s) with subdirectory
 *
 * @example
 * ```typescript
 * const projects: ProjectLocation[] = [
 *   { name: 'project-a', subdir: '', displayName: 'project-a', ... },
 *   { name: 'project-b', subdir: 'lib/a', displayName: 'lib/a/project-b', ... },
 * ];
 *
 * const result = await promptProjectSelection(projects);
 * // User searches for "lib" and selects "lib/a/project-b"
 * // Returns: { projects: ['project-b'], subdir: 'lib/a' }
 * ```
 */
export async function promptProjectSelection(
  projectLocations: ProjectLocation[]
): Promise<ProjectSelectionResult> {
  // Source function: Filters projects based on user input (Requirement 2.6)
  const sourceFunction = async (input: string): Promise<Array<{ value: string; name: string }>> => {
    // Normalize input for case-insensitive search
    const normalizedInput = input.toLowerCase();

    // Filter projects: case-insensitive partial match on displayName
    const filteredProjects = projectLocations.filter((project) =>
      project.displayName.toLowerCase().includes(normalizedInput)
    );

    // Convert to search choices
    return filteredProjects.map((project) => ({
      value: project.displayName,
      name: project.displayName,
    }));
  };

  // Call search prompt with real-time filtering (Requirement 2.5)
  const selectedDisplayName = await search({
    message: 'Select a project (type to filter):',
    source: sourceFunction,
  });

  // Extract project name and subdirectory from selected displayName
  const selectedProject = projectLocations.find(
    (project) => project.displayName === selectedDisplayName
  );

  if (!selectedProject) {
    // This should never happen if search returns valid value
    throw new Error(`Selected project not found: ${selectedDisplayName}`);
  }

  // Return result with project name and subdirectory
  return {
    projects: [selectedProject.name],
    subdir: selectedProject.subdir,
  };
}
