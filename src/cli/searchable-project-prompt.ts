/**
 * Searchable Project Prompt Service
 *
 * Provides search-enabled project selection UI using @inquirer/prompts search
 */

import searchableCheckbox from './prompts/searchable-checkbox.js';
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
 * Uses custom searchableCheckbox prompt to provide real-time filtering and selection:
 * - Case-insensitive partial match search across displayName
 * - Filter applies to both subdirectory path and project name
 * - Empty input shows all projects
 * - Single-step UI: search and select in one prompt
 *
 * Task 3.1: Replace two-step UI with searchable checkbox
 * Requirements: 2.5, 2.6, 4.1-4.8
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
  // Convert ProjectLocation[] to choices for searchableCheckbox
  const choices = projectLocations.map((project) => ({
    value: project.displayName,
    name: project.displayName,
  }));

  // Call searchable checkbox with validation
  const selectedDisplayNames = await searchableCheckbox<string>({
    message: 'Select projects (type to filter, space to select, enter to confirm):',
    choices,
    // Validation: At least one selection + same subdirectory constraint
    validate: (selectedChoices) => {
      // Must select at least one project
      if (selectedChoices.length === 0) {
        return 'Please select at least one project';
      }

      // Extract displayNames from normalized choices
      const displayNames = selectedChoices.map((choice) => choice.value);

      // Find subdirectories of all selected projects
      const selectedProjects = displayNames
        .map((displayName) =>
          projectLocations.find((p) => p.displayName === displayName)
        )
        .filter((p): p is ProjectLocation => p !== undefined);

      // Extract unique subdirectories
      const uniqueSubdirs = new Set(selectedProjects.map((p) => p.subdir));

      // All selected projects must be in the same subdirectory
      if (uniqueSubdirs.size > 1) {
        const subdirList = Array.from(uniqueSubdirs)
          .map((s) => (s === '' ? 'root' : s))
          .join(', ');
        return `All projects must be in the same subdirectory. Selected subdirectories: ${subdirList}`;
      }

      return true;
    },
    pageSize: 10,
    loop: true,
  });

  // Extract project names and subdirectory from selected displayNames
  const selectedProjects = selectedDisplayNames
    .map((displayName) =>
      projectLocations.find((p) => p.displayName === displayName)
    )
    .filter((p): p is ProjectLocation => p !== undefined);

  if (selectedProjects.length === 0) {
    throw new Error('No valid projects selected');
  }

  // All selected projects have same subdirectory (enforced by validation)
  const subdir = selectedProjects[0]!.subdir;

  return {
    projects: selectedProjects.map((p) => p.name),
    subdir,
  };
}
