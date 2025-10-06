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
    .argument('<repository>', 'GitHub repository in format "owner/repo"')
    .requiredOption('-p, --project <name>', 'Project name to fetch')
    .option('-o, --output <path>', 'Output directory (default: current directory)', '.')
    .option('--force', 'Force overwrite without confirmation', false)
    .option('--dry-run', 'Dry-run mode (no actual writes)', false)
    .option('--verbose', 'Verbose logging', false)
    .option('--config <path>', 'Custom config file path')
    .allowExcessArguments(false);

  program.parse(argv);

  const repository = program.args[0];
  const options = program.opts<{
    project: string;
    output: string;
    force: boolean;
    dryRun: boolean;
    verbose: boolean;
    config?: string;
  }>();

  if (!repository) {
    throw new Error('Repository argument is required');
  }

  return {
    repository,
    project: options.project,
    output: options.output,
    force: options.force,
    dryRun: options.dryRun,
    verbose: options.verbose,
    config: options.config,
  };
}
