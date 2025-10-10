/**
 * GitHub Project Location Builder
 *
 * Builds ProjectLocation objects from parsed tree items with display name formatting
 */

import type { ParsedTreeItem } from './tree-response-parser.js';

/**
 * Project location information
 */
export interface ProjectLocation extends ParsedTreeItem {
  /** Project name (from ParsedTreeItem.projectName) */
  name: string;
  /** Display name (subdir/name or name for root) */
  displayName: string;
}

/**
 * Build ProjectLocation objects from parsed tree items
 *
 * Generates display names based on subdirectory location:
 * - Root projects: displayName = projectName
 * - Subdirectory projects: displayName = "subdir/projectName"
 *
 * Duplicate project names in different subdirectories are distinguished
 * by their displayName which includes the subdirectory path.
 *
 * @param parsedItems - Array of parsed tree items
 * @returns Array of project locations with formatted display names
 */
export function buildProjectLocations(parsedItems: ParsedTreeItem[]): ProjectLocation[] {
  return parsedItems.map((item) => {
    // Generate displayName based on subdirectory presence
    const displayName = item.subdir ? `${item.subdir}/${item.projectName}` : item.projectName;

    return {
      ...item,
      name: item.projectName,
      displayName,
    };
  });
}
