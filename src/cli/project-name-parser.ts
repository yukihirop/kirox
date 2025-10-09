/**
 * Project Name Parser
 *
 * Parses project name(s) from input string.
 * Supports both single and comma-separated multiple project names.
 */

/**
 * Parse project name(s) from input string
 *
 * Supports both single and comma-separated multiple project names.
 * Trims whitespace and filters out empty strings.
 *
 * @param input - Project name(s) as string
 * @returns Array of project names
 *
 * @example
 * parseProjects("project1") // ["project1"]
 * parseProjects("project1,project2,project3") // ["project1", "project2", "project3"]
 * parseProjects("proj1, proj2 , proj3") // ["proj1", "proj2", "proj3"]
 * parseProjects("proj1,,proj3") // ["proj1", "proj3"]
 */
export function parseProjects(input: string): string[] {
  // Trim the entire input first
  const trimmedInput = input.trim();

  // Return empty array if input is empty after trimming
  if (trimmedInput === '') {
    return [];
  }

  // Split by comma, trim each element, and filter out empty strings
  return trimmedInput
    .split(',')
    .map(project => project.trim())
    .filter(project => project !== '');
}
