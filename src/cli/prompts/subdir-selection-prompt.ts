import chalk from 'chalk';
import searchableCheckbox from './searchable-checkbox.js';
import type { DirectoryLocation } from '../../github/tree-based-dir-scanner.js';

export interface SubdirSelectionResult {
  
  subdir: string;
}

function sortDirectoryLocations(
  directories: DirectoryLocation[]
): Array<{
  path: string;
  displayName: string;
  sha: string;
}> {
  
  const hasRoot = directories.some((dir) => dir.path === '');
  const allDirectories: Array<{
    path: string;
    displayName: string;
    sha: string;
  }> = hasRoot ? directories : [{ path: '', displayName: '(root)', sha: '' }, ...directories];

  return [...allDirectories].sort((a, b) => {
    
    if (a.path === '' && b.path !== '') return -1;
    if (a.path !== '' && b.path === '') return 1;

    return a.path.localeCompare(b.path);
  });
}

export async function promptSubdirSelection(
  directories: DirectoryLocation[]
): Promise<SubdirSelectionResult> {
  
  const sortedDirectories = sortDirectoryLocations(directories);

  const choices = sortedDirectories.map((dir) => ({
    value: dir.displayName,
    name: dir.displayName,
  }));

  const selectedDisplayNames = await searchableCheckbox<string>({
    message:
      chalk.bold.cyan('📁 Select subdirectory') +
      chalk.dim(' (type to filter, space to select, enter to confirm)'),
    choices,
    
    validate: (selectedChoices) => {
      
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

  const selectedDisplayName = selectedDisplayNames[0];

  const selectedDirectory = sortedDirectories.find((dir) => dir.displayName === selectedDisplayName);

  if (!selectedDirectory) {
    throw new Error('Invalid directory selection');
  }

  return {
    subdir: selectedDirectory.path,
  };
}
