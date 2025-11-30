import chalk from 'chalk';
import searchableCheckbox from './searchable-checkbox.js';
import type { ProjectLocation } from '../../github/project-location-builder.js';

export interface ProjectSelectionResult {
  projects: string[];
  subdir: string;
}

function sortProjectLocations(projectLocations: ProjectLocation[]): ProjectLocation[] {
  return [...projectLocations].sort((a, b) => {
    
    if (a.subdir === '' && b.subdir !== '') return -1;
    if (a.subdir !== '' && b.subdir === '') return 1;

    if (a.subdir === '' && b.subdir === '') {
      return a.name.localeCompare(b.name);
    }

    const subdirCompare = a.subdir.localeCompare(b.subdir);
    if (subdirCompare !== 0) return subdirCompare;

    return a.name.localeCompare(b.name);
  });
}

export async function promptProjectSelection(
  projectLocations: ProjectLocation[]
): Promise<ProjectSelectionResult> {
  
  const sortedLocations = sortProjectLocations(projectLocations);

  const choices = sortedLocations.map((project) => ({
    value: project.displayName,
    name: project.displayName,
  }));

  const selectedDisplayNames = await searchableCheckbox<string>({
    message:
      chalk.bold.cyan('📋 Select projects') +
      chalk.dim(' (type to filter, space to select, enter to confirm)'),
    choices,
    
    validate: (selectedChoices) => {
      
      if (selectedChoices.length === 0) {
        return chalk.red('Please select at least one project');
      }

      const displayNames = selectedChoices.map((choice) => choice.value);

      const selectedProjects = displayNames
        .map((displayName) => projectLocations.find((p) => p.displayName === displayName))
        .filter((p): p is ProjectLocation => p !== undefined);

      const uniqueSubdirs = new Set(selectedProjects.map((p) => p.subdir));

      if (uniqueSubdirs.size > 1) {
        const subdirList = Array.from(uniqueSubdirs)
          .map((s) => (s === '' ? 'root' : s))
          .join(', ');
        return chalk.red(
          `All projects must be in the same subdirectory. Selected subdirectories: ${subdirList}`
        );
      }

      return true;
    },
    pageSize: 10,
    loop: true,
  });

  const selectedProjects = selectedDisplayNames
    .map((displayName) => projectLocations.find((p) => p.displayName === displayName))
    .filter((p): p is ProjectLocation => p !== undefined);

  if (selectedProjects.length === 0) {
    throw new Error('No valid projects selected');
  }

  const subdir = selectedProjects[0]!.subdir;

  return {
    projects: selectedProjects.map((p) => p.name),
    subdir,
  };
}
