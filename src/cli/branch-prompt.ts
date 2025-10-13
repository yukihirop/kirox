/**
 * Branch Selection Prompt Service
 *
 * Provides search-enabled branch selection UI using searchable-checkbox
 */

import chalk from 'chalk';
import searchableCheckbox from './prompts/searchable-checkbox.js';

/**
 * Prompt user to select a single branch with search functionality
 *
 * Uses custom searchableCheckbox prompt to provide real-time filtering and selection:
 * - Case-insensitive partial match search
 * - Default branch displayed with "(default)" label at the top
 * - Other branches sorted alphabetically
 * - Single branch selection only (validation enforced)
 * - 0 selections allowed (returns undefined to use default branch)
 *
 * Task 2.1: Branch selection prompt with searchable-checkbox
 * Requirements: 3.1, 3.5, 3.6, 3.7, 4.1, 4.2
 *
 * @param branches - Available branch names
 * @param defaultBranch - Default branch name (optional)
 * @returns Selected branch name, or undefined if no selection (use default)
 *
 * @example
 * ```typescript
 * const branches = ['main', 'develop', 'feature/auth'];
 * const defaultBranch = 'main';
 *
 * const selected = await promptBranch(branches, defaultBranch);
 * // User sees:
 * //   [✓] main (default)
 * //   [ ] develop
 * //   [ ] feature/auth
 * // Returns: 'main' or undefined
 * ```
 */
export async function promptBranch(
  branches: string[],
  defaultBranch?: string
): Promise<string | undefined> {
  // Sort branches: default first, others alphabetically
  const sortedBranches = [...branches].sort((a, b) => {
    // Default branch comes first
    if (a === defaultBranch) return -1;
    if (b === defaultBranch) return 1;
    // Others sorted alphabetically
    return a.localeCompare(b);
  });

  // Create choices with default label
  const choices = sortedBranches.map((branch) => {
    const label = branch === defaultBranch
      ? chalk.green(`${branch}`) + chalk.dim(' (default)')
      : branch;
    return {
      value: branch,
      name: label,
    };
  });

  // Call searchable checkbox with single-selection validation
  const selectedBranches = await searchableCheckbox<string>({
    message: chalk.bold.cyan('Select branch') +
      chalk.dim(' (type to filter, space to select, enter to confirm)'),
    choices,
    // Validation: Exactly one selection or zero selections (use default)
    validate: (selectedChoices) => {
      if (selectedChoices.length === 0) {
        // 0 selections is valid - will use default branch
        return true;
      }

      if (selectedChoices.length > 1) {
        return chalk.red('Please select only one branch');
      }

      return true;
    },
    pageSize: 10,
    loop: true,
  });

  // Return selected branch or undefined if no selection
  if (selectedBranches.length === 0) {
    return undefined;
  }

  return selectedBranches[0];
}
