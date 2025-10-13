/**
 * CLI Argument Parser
 *
 * Parses command-line arguments using Commander.js
 */

import { Command } from 'commander';
import chalk from 'chalk';
import type { ParsedArguments } from './types.js';
import { parseProjects } from './project-name-parser.js';

/**
 * Parse command-line arguments
 *
 * @param argv - Command-line arguments (process.argv)
 * @returns Parsed arguments
 * @throws Error if required arguments are missing or invalid
 */
export function parseArguments(argv: string[]): ParsedArguments {
  // Check if 'add' subcommand is present
  const isAddCommand = argv.includes('add') && argv.indexOf('add') >=2; // must be after 'node' and 'script'

  if (isAddCommand) {
    // Parse add subcommand
    return parseAddCommand(argv);
  }

  // Parse main command (existing behavior)
  return parseMainCommand(argv);
}

/**
 * Parse 'add' subcommand arguments
 */
function parseAddCommand(argv: string[]): ParsedArguments {
  const program = new Command();

  program
    .name('kirox add')
    .description('Add new projects to existing metadata')
    .argument('[repository]', 'GitHub repository in format "owner/repo" or "owner/repo#branch"')
    .option('-p, --project <name>', 'Project names - comma-separated for multiple projects')
    .option('-o, --output <path>', 'Output directory (default: current directory)', '.')
    .option('-s, --subdir <path>', 'Subdirectory path containing .kiro folder')
    .option('--force', 'Overwrite existing projects', false)
    .option('--dry-run', 'Dry-run mode (no actual writes)', false)
    .option('--verbose', 'Verbose logging', false)
    .option('--config <path>', 'Custom config file path')
    .addHelpText('after', `
${chalk.bold.blue('Examples:')}
  ${chalk.dim('# Add new project to existing metadata')}
  ${chalk.cyan('$')} ${chalk.green('npx kirox add')} ${chalk.cyan('owner/repo')} ${chalk.cyan('-p')} new-project

  ${chalk.dim('# Add multiple projects at once')}
  ${chalk.cyan('$')} ${chalk.green('npx kirox add')} ${chalk.cyan('owner/repo')} ${chalk.cyan('-p')} proj1,proj2,proj3

  ${chalk.dim('# Add project from specific branch')}
  ${chalk.cyan('$')} ${chalk.green('npx kirox add')} ${chalk.cyan('owner/repo#feature')} ${chalk.cyan('-p')} new-project

  ${chalk.dim('# Add project with subdirectory')}
  ${chalk.cyan('$')} ${chalk.green('npx kirox add')} ${chalk.cyan('owner/repo')} ${chalk.cyan('--subdir')} packages/api ${chalk.cyan('-p')} new-project

  ${chalk.dim('# Force overwrite existing project')}
  ${chalk.cyan('$')} ${chalk.green('npx kirox add')} ${chalk.cyan('owner/repo')} ${chalk.cyan('-p')} existing-project ${chalk.cyan('--force')}

  ${chalk.dim('# Interactive mode (no arguments)')}
  ${chalk.cyan('$')} ${chalk.green('npx kirox add')}

${chalk.bold.yellow('Note:')}
  The 'add' command requires existing metadata file (.kirox-meta.json).
  Run regular fetch command first if metadata doesn't exist.
`)
    .allowExcessArguments(false);

  // Remove 'add' from argv to parse correctly
  const addIndex = argv.indexOf('add');
  const addArgv = [...argv.slice(0, addIndex), ...argv.slice(addIndex + 1)];

  program.parse(addArgv);

  const repository = program.args[0] || '';
  const options = program.opts<{
    project?: string;
    output: string;
    subdir?: string;
    force: boolean;
    dryRun: boolean;
    verbose: boolean;
    config?: string;
  }>();

  const projects = parseProjects(options.project || '');

  return {
    subcommand: 'add',
    repository,
    projects,
    output: options.output,
    force: options.force,
    dryRun: options.dryRun,
    verbose: options.verbose,
    config: options.config,
    track: true, // Always true for add command
    checkUpdates: false,
    update: false,
    subdir: options.subdir,
  };
}

/**
 * Parse main command arguments (existing behavior)
 */
function parseMainCommand(argv: string[]): ParsedArguments {
  const program = new Command();

  program
    .name('kirox')
    .description('CLI tool to fetch Kiro specification and steering files from remote GitHub repositories')
    .version('0.1.0')
    .argument('[repository]', 'GitHub repository in format "owner/repo" or "owner/repo#branch"')
    .option('-p, --project <name>', 'Project name to fetch (comma-separated for multiple projects)')
    .option('-o, --output <path>', 'Output directory (default: current directory)', '.')
    .option('-s, --subdir <path>', 'Subdirectory path containing .kiro folder')
    .option('--force', 'Force overwrite without confirmation', false)
    .option('--dry-run', 'Dry-run mode (no actual writes)', false)
    .option('--verbose', 'Verbose logging', false)
    .option('--config <path>', 'Custom config file path')
    .option('--track', 'Track fetched files for update detection', false)
    .option('--check-updates', 'Check for updates to tracked files', false)
    .option('--update', 'Apply updates to tracked files', false)
    .addHelpText('after', `
${chalk.bold.blue('Interactive Mode:')}
  When run without arguments, kirox enters interactive mode and guides you
  through entering repository, project name, and other options step-by-step.

  ${chalk.green('$ npx kirox')}
  ${chalk.cyan('?')} Enter GitHub repository (owner/repo or owner/repo#branch): owner/repo
  ${chalk.cyan('?')} Enter project name: my-project
  ${chalk.cyan('?')} Enter output directory: .
  ${chalk.cyan('?')} Enter subdirectory in GitHub repository (optional):
  ${chalk.green('✓')} Configuration confirmed

${chalk.bold.blue('Examples:')}
  ${chalk.dim('# Interactive mode (recommended for first-time users)')}
  ${chalk.green('$ npx kirox')}

  ${chalk.dim('# Non-interactive mode with explicit arguments')}
  ${chalk.green('$ npx kirox owner/repo -p my-project')}
  ${chalk.green('$ npx kirox owner/repo#feature/new-api -p my-project')}
  ${chalk.green('$ npx kirox owner/repo --subdir packages/api -p my-project')}
  ${chalk.green('$ npx kirox owner/repo#develop --subdir packages/api -p my-project')}

  ${chalk.dim('# Multiple projects (comma-separated)')}
  ${chalk.green('$ npx kirox owner/repo -p proj1,proj2,proj3')}
  ${chalk.green('$ npx kirox owner/repo --subdir packages -p api-spec,web-spec')}

${chalk.bold.yellow('Note:')}
  • Branch specification: Use ${chalk.cyan('#')} after repository (e.g., ${chalk.cyan('owner/repo#develop')})
  • Multiple projects: Comma-separated list (e.g., ${chalk.cyan('-p proj1,proj2')})
  • Interactive mode is only available in TTY environments
`)
    .allowExcessArguments(false);

  program.parse(argv);

  const repository = program.args[0] || '';
  const options = program.opts<{
    project?: string;
    output: string;
    subdir?: string;
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
  // NOTE: Interactive mode will handle missing arguments, so we allow empty repository/project
  // The validation will be performed after interactive prompts in entry.ts
  if (!options.checkUpdates && !options.update) {
    // Allow empty repository and project for interactive mode
    // Validation will be performed later in the flow
  }

  // If --check-updates or --update is specified, disable --track
  const track = (options.checkUpdates || options.update) ? false : options.track;

  // Parse project name(s) into array
  // Empty string becomes empty array, single project becomes 1-element array,
  // comma-separated projects become multi-element array
  const projects = parseProjects(options.project || '');

  return {
    repository,
    projects,
    output: options.output,
    force: options.force,
    dryRun: options.dryRun,
    verbose: options.verbose,
    config: options.config,
    track,
    checkUpdates: options.checkUpdates,
    update: options.update,
    subdir: options.subdir,
  };
}
