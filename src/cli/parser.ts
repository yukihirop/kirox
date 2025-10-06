/**
 * CLI Argument Parser
 *
 * Parses command-line arguments using Commander.js
 */

import { Command } from 'commander';
import type { ParsedArguments } from './types.js';

/**
 * Parse command-line arguments
 *
 * @param argv - Command-line arguments (process.argv)
 * @returns Parsed arguments
 * @throws Error if required arguments are missing or invalid
 */
export function parseArguments(argv: string[]): ParsedArguments {
  const program = new Command();

  program
    .name('kirox')
    .description('CLI tool to fetch Kiro specification and steering files from remote GitHub repositories')
    .version('0.1.0')
    .argument('[repository]', 'GitHub repository in format "owner/repo"')
    .option('-p, --project <name>', 'Project name to fetch')
    .option('-o, --output <path>', 'Output directory (default: current directory)', '.')
    .option('--force', 'Force overwrite without confirmation', false)
    .option('--dry-run', 'Dry-run mode (no actual writes)', false)
    .option('--verbose', 'Verbose logging', false)
    .option('--config <path>', 'Custom config file path')
    .option('--track', 'Track fetched files for update detection', false)
    .option('--check-updates', 'Check for updates to tracked files', false)
    .option('--update', 'Apply updates to tracked files', false)
    .allowExcessArguments(false);

  program.parse(argv);

  const repository = program.args[0] || '';
  const options = program.opts<{
    project?: string;
    output: string;
    force: boolean;
    dryRun: boolean;
    verbose: boolean;
    config?: string;
    track: boolean;
    checkUpdates: boolean;
    update: boolean;
  }>();

  // For --check-updates and --update, repository and project are optional
  // For regular fetch, repository and project are required
  if (!options.checkUpdates && !options.update) {
    if (!repository) {
      throw new Error('Repository argument is required');
    }
    if (!options.project) {
      throw new Error('Project option is required');
    }
  }

  return {
    repository,
    project: options.project || '',
    output: options.output,
    force: options.force,
    dryRun: options.dryRun,
    verbose: options.verbose,
    config: options.config,
    track: options.track,
    checkUpdates: options.checkUpdates,
    update: options.update,
  };
}
