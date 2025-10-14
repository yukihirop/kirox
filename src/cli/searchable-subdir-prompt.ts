/**
 * Searchable Subdirectory Prompt Service
 *
 * Provides search-enabled subdirectory selection UI for --steering mode
 * Requirement 9: Interactive subdirectory selection UI (--steering mode only)
 */

import chalk from 'chalk';
import searchableCheckbox from './prompts/searchable-checkbox.js';
import type { DirectoryLocation } from '../github/tree-based-dir-scanner.js';

/**
 * Subdirectory selection result
 */
export interface SubdirSelectionResult {
  /** Selected subdirectory path (empty string for root) */
  subdir: string;
}

/**
 * Sort directory locations for display
 *
 * Sorting rules (Requirement 9.5):
 * 1. Root directory first (displayed as "(root)")
 * 2. Then other directories, sorted alphabetically by path
 *
 * @param directories - Unsorted directory locations
 * @returns Sorted directory locations with root option
 */
function sortDirectoryLocations(directories: DirectoryLocation[]): Array<{
  path: string;
  displayName: string;
  sha: string;
}> {
  // Add root directory option only if not already present (Task 11.1)
  const hasRoot = directories.some((dir) => dir.path === '');
  const allDirectories: Array<{
    path: string;
    displayName: string;
    sha: string;
  }> = hasRoot
    ? directories
    : [{ path: '', displayName: '(root)', sha: '' }, ...directories];

  // Sort: root first, then alphabetically
  return [...allDirectories].sort((a, b) => {
    // Root directory comes first
    if (a.path === '' && b.path !== '') return -1;
    if (a.path !== '' && b.path === '') return 1;

    // Both non-root: sort alphabetically by path
    return a.path.localeCompare(b.path);
  });
}

/**
 * Prompt user to select subdirectory with search functionality
 *
 * Uses custom searchableCheckbox prompt to provide real-time filtering and selection:
 * - Case-insensitive partial match search across directory path
 * - Empty input shows all directories
 * - Single-step UI: search and select in one prompt
 * - Root directory option always available
 *
 * Requirements: 9.2, 9.3, 9.4, 9.5, 9.6
 *
 * @param directories - Available directory locations from Tree API
 * @returns Selected subdirectory path (empty string for root)
 *
 * @example
 * ```typescript
 * const directories: DirectoryLocation[] = [
 *   { path: 'src', displayName: 'src', sha: 'sha1' },
 *   { path: 'lib', displayName: 'lib', sha: 'sha2' },
 * ];
 *
 * const result = await promptSubdirSelection(directories);
 * // User searches for "src" and selects "src"
 * // Returns: { subdir: 'src' }
 *
 * // Or user selects "(root)"
 * // Returns: { subdir: '' }
 * ```
 */
export async function promptSubdirSelection(
  directories: DirectoryLocation[]
): Promise<SubdirSelectionResult> {
  // Sort directories for better UX (Requirement 9.5)
  const sortedDirectories = sortDirectoryLocations(directories);

  // Convert DirectoryLocation[] to choices for searchableCheckbox
  const choices = sortedDirectories.map((dir) => ({
    value: dir.displayName,
    name: dir.displayName,
  }));

  // Call searchable checkbox with validation (Requirement 9.2, 9.4)
  const selectedDisplayNames = await searchableCheckbox<string>({
    message: chalk.bold.cyan('Select subdirectory') +
      chalk.dim(' (type to filter, space to select, enter to confirm)'), // Requirement 9.5
    choices,
    // Validation: Exactly one selection required (Requirement 9.6)
    validate: (selectedChoices) => {
      // Must select exactly one subdirectory
      if (selectedChoices.length === 0) {
        return chalk.red('Please select a subdirectory');
      }

      if (selectedChoices.length > 1) {
        return chalk.red('Please select only one subdirectory');
      }

      return true;
    },
    pageSize: 10,
    loop: true,
  });

  // Extract selected directory displayName
  const selectedDisplayName = selectedDisplayNames[0];

  // Find the selected directory
  const selectedDirectory = sortedDirectories.find(
    (dir) => dir.displayName === selectedDisplayName
  );

  if (!selectedDirectory) {
    throw new Error('Invalid directory selection');
  }

  // Return empty string for root, otherwise return the path (Requirement 9.3, 9.6)
  return {
    subdir: selectedDirectory.path,
  };
}
