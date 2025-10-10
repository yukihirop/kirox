/**
 * GitHub Tree API Response Parser
 *
 * Filters and parses Tree API responses to extract project locations from .kiro/specs/ directories
 */

/**
 * Tree item from GitHub Tree API response
 */
export interface TreeItem {
  path: string;
  type: 'blob' | 'tree';
  mode: string;
  sha: string;
  url: string;
  size?: number;
}

/**
 * Parsed tree item with extracted project information
 */
export interface ParsedTreeItem extends TreeItem {
  projectName: string;
  subdir: string;
}

/**
 * Parse Tree API response to extract .kiro/specs/ project locations
 *
 * Filters tree items to find only .kiro/specs/ directories and extracts:
 * - Project name from the path
 * - Subdirectory path (if nested)
 *
 * Pattern matching:
 * - Root level: `.kiro/specs/project-name` → projectName: 'project-name', subdir: ''
 * - Nested: `lib/a/.kiro/specs/project-name` → projectName: 'project-name', subdir: 'lib/a'
 *
 * @param treeItems - Array of tree items from GitHub Tree API
 * @returns Array of parsed tree items containing .kiro/specs/ directories
 */
export function parseTreeResponse(treeItems: TreeItem[]): ParsedTreeItem[] {
  // Regex pattern: /^(?:(.+?)\/)?\.kiro\/specs\/([^/]+)$/
  // - ^              : Start of string
  // - (?:(.+?)\/)?   : Optional group for subdirectory path (captured in group 1)
  // - \.kiro\/specs\/ : Literal match for .kiro/specs/
  // - ([^/]+)        : Capture project name (group 2), one or more non-slash characters
  // - $              : End of string (ensures no trailing segments)
  const pattern = /^(?:(.+?)\/)?\.kiro\/specs\/([^/]+)$/;

  return treeItems
    // Early filter: Only paths containing .kiro/specs/
    .filter(item => item.path.includes('.kiro/specs/'))
    // Filter: Only directory entries (type === 'tree')
    .filter(item => item.type === 'tree')
    // Map and filter: Extract project info using regex
    .map(item => {
      const match = item.path.match(pattern);

      if (!match) {
        return null;
      }

      const subdir = match[1] || ''; // Group 1: subdirectory (empty string if root level)
      const projectName = match[2];  // Group 2: project name

      return {
        ...item,
        projectName,
        subdir,
      };
    })
    .filter((item): item is ParsedTreeItem => item !== null);
}
