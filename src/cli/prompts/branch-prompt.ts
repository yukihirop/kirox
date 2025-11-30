import chalk from 'chalk';
import searchableCheckbox from './searchable-checkbox.js';

export async function promptBranch(
  branches: string[],
  defaultBranch?: string
): Promise<string | undefined> {
  
  const sortedBranches = [...branches].sort((a, b) => {
    
    if (a === defaultBranch) return -1;
    if (b === defaultBranch) return 1;
    
    return a.localeCompare(b);
  });

  const choices = sortedBranches.map((branch) => {
    const label =
      branch === defaultBranch
        ? chalk.green(`${branch}`) + chalk.dim(' (default)')
        : branch;
    return {
      value: branch,
      name: label,
    };
  });

  const selectedBranches = await searchableCheckbox<string>({
    message:
      chalk.bold.cyan('🌿 Select branch') +
      chalk.dim(' (type to filter, space to select, enter to confirm)'),
    choices,
    
    validate: (selectedChoices) => {
      if (selectedChoices.length === 0) {
        
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

  if (selectedBranches.length === 0) {
    return undefined;
  }

  return selectedBranches[0];
}
