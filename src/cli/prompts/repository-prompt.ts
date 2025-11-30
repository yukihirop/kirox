import { input } from '@inquirer/prompts';
import chalk from 'chalk';
import { validateRepositoryFormat } from '../validator.js';
import type { Metadata } from '../../tracking/types.js';

export async function promptRepository(
  currentValue: string,
  metadata?: Metadata
): Promise<string> {
  
  if (currentValue && currentValue.trim() !== '') {
    return currentValue;
  }

  let defaultRepository: string | undefined;
  if (metadata && metadata.projects.length > 0) {
    
    const lastProject = metadata.projects[metadata.projects.length - 1];
    if (lastProject) {
      defaultRepository = lastProject.repository;
    }
  }

  return await input({
    message:
      chalk.bold.cyan('📦 Enter GitHub repository (owner/repo or owner/repo#branch)') +
      (defaultRepository ? chalk.dim(` (default: ${defaultRepository})`) : ''),
    ...(defaultRepository && { default: defaultRepository }),
    validate: (value: string) => {
      const errors = validateRepositoryFormat(value);
      if (errors.length > 0) {
        return chalk.red(errors[0]?.message || 'Invalid repository format');
      }
      return true;
    },
  });
}
