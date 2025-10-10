/**
 * Searchable Project Prompt Service
 *
 * Provides search-enabled project selection UI using @inquirer/prompts search
 */

import { search, checkbox } from '@inquirer/prompts';
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
  const sourceFunction = async (
    input: string | undefined,
    _opt: { signal: AbortSignal }
  ): Promise<Array<{ value: string; name: string }>> => {
    // Normalize input for case-insensitive search (empty string if undefined)
    const normalizedInput = (input || '').toLowerCase();

    // Filter projects: case-insensitive partial match on displayName
    const filteredProjects = projectLocations.filter((project) =>
      project.displayName.toLowerCase().includes(normalizedInput)
    );

    // Task 3.2: Handle empty search results (Requirement 2.7)
    if (filteredProjects.length === 0) {
      // Return "No matching projects found" message
      return [
        {
          value: '__no_match__',
          name: 'No matching projects found',
        },
      ];
    }

    // Convert filtered projects to search choices
    const projectChoices = filteredProjects.map((project) => ({
      value: project.displayName,
      name: project.displayName,
    }));

    // Task 3.3: Add multiple selection mode trigger (Requirement 4.1)
    // Only show multiple selection option when:
    // 1. There are 2+ projects available
    // 2. User hasn't started filtering yet (input is empty/undefined)
    const showMultipleOption = filteredProjects.length >= 2 && normalizedInput === '';

    if (showMultipleOption) {
      const multipleSelectionOption = {
        value: '__select_multiple__',
        name: '[Select multiple projects...]',
      };

      return [multipleSelectionOption, ...projectChoices];
    }

    // Return project choices without multiple selection option
    return projectChoices;
  };

  // Call search prompt with real-time filtering (Requirement 2.5)
  const selectedDisplayName = await search({
    message: 'Select a project (type to filter):',
    source: sourceFunction,
  });

  // Task 3.3: Check if user selected multiple selection mode (Requirement 4.1)
  if (selectedDisplayName === '__select_multiple__') {
    // Task 3.4-3.6: Switch to checkbox prompt with subdirectory constraint validation
    // Note: @inquirer/prompts checkbox does NOT support dynamic choices functions
    // Instead, we use static choices array and validate subdirectory constraint in validate function
    const selectedDisplayNames = await checkbox<string>({
      message: 'Select projects (use space to select, enter to confirm):',
      // Static choices: show all projects (Requirement 4.4)
      choices: projectLocations.map((project) => ({
        value: project.displayName,
        name: project.displayName,
      })),
      // Task 3.6: Validation function (Requirement 4.7)
      // Task 3.4: Enforce same subdirectory constraint (Requirements 4.2-4.4, 4.8)
      // Note: The validate function receives the array of selected VALUES (strings), not Choice objects
       
      validate: ((selectedValues: readonly string[]) => {
        // Must select at least one project
        if (selectedValues.length === 0) {
          return 'Please select at least one project';
        }

        // Find subdirectories of all selected projects
        const selectedProjects = selectedValues
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
      }) as any,
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

    // All selected projects should have same subdirectory (enforced by dynamic filtering)
     
    const subdir = selectedProjects[0]!.subdir;

    return {
      projects: selectedProjects.map((p) => p.name),
      subdir,
    };
  }

  // Single selection mode (original logic)
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
