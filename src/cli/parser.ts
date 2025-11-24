/**
 * CLI Argument Parser
 *
 * Parses command-line arguments using Commander.js
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import type { ParsedArguments } from './types.js';
import { parseProjects } from './project-name-parser.js';
import { generateKiroxAsciiArt } from './utilities/ascii-art-utils.js';
import {
  mainCommandOptions,
  addCommandOptions,
  applyCommandOptions,
} from './parser-config.js';

// Get version from package.json or build-time define
function getVersion(): string {
  // In production build, __KIROX_VERSION__ is defined by tsup
  if (typeof __KIROX_VERSION__ !== 'undefined') {
    return __KIROX_VERSION__;
  }

  // In development (tsx), read from package.json
  try {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const packageJsonPath = join(__dirname, '../../package.json');
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
    return packageJson.version || '0.0.0-dev';
  } catch (_error) {
    return '0.0.0-dev';
  }
}

const VERSION = getVersion();

/**
 * Parse command-line arguments
 *
 * @param argv - Command-line arguments (process.argv)
 * @returns Parsed arguments
 * @throws Error if required arguments are missing or invalid
 */
export function parseArguments(argv: string[]): ParsedArguments {
  // Check subcommands - priority order: add > completion > main
  // Subcommands must appear at index >= 2 (after 'node' and script path)
  const isAddCommand = argv.includes('add') && argv.indexOf('add') >= 2;
  const isCompletionCommand = argv.includes('completion') && argv.indexOf('completion') >= 2;

  // Route based on priority: add takes priority over completion
  if (isAddCommand && isCompletionCommand) {
    // If both present, use the one that appears first
    const addIndex = argv.indexOf('add');
    const completionIndex = argv.indexOf('completion');

    if (addIndex < completionIndex) {
      return parseAddCommand(argv);
    } else {
      return parseCompletionCommand(argv);
    }
  } else if (isAddCommand) {
    // Only add is present
    return parseAddCommand(argv);
  } else if (isCompletionCommand) {
    // Only completion is present
    return parseCompletionCommand(argv);
  }

  // Parse main command (existing behavior)
  return parseMainCommand(argv);
}

/**
 * Parse 'completion' subcommand arguments
 *
 * Task 1.2: Completion subcommand parser
 */
function parseCompletionCommand(argv: string[]): ParsedArguments {
  const program = new Command();

  program
    .name('kirox completion')
    .description('Generate shell completion script')
    .argument('[shell]', 'Shell type: bash, zsh, fish, powershell, elvish')
    .addHelpText('after', `
${chalk.bold.blue('Supported Shells:')}
  • bash
  • zsh
  • fish
  • powershell
  • elvish

${chalk.bold.blue('Examples:')}
  ${chalk.dim('# Generate bash completion script')}
  ${chalk.cyan('$')} ${chalk.green('kirox completion')} ${chalk.cyan('bash')} > ~/.kirox-completion.bash

  ${chalk.dim('# Generate zsh completion script')}
  ${chalk.cyan('$')} ${chalk.green('kirox completion')} ${chalk.cyan('zsh')} > ~/.kirox-completion.zsh

  ${chalk.dim('# Generate fish completion script')}
  ${chalk.cyan('$')} ${chalk.green('kirox completion')} ${chalk.cyan('fish')} > ~/.config/fish/completions/kirox.fish

  ${chalk.dim('# Generate PowerShell completion script')}
  ${chalk.cyan('PS>')} ${chalk.green('kirox completion')} ${chalk.cyan('powershell')} > ~/kirox-completion.ps1

  ${chalk.dim('# Generate Elvish completion script')}
  ${chalk.cyan('$')} ${chalk.green('kirox completion')} ${chalk.cyan('elvish')} > ~/.elvish/lib/kirox-completion.elv

${chalk.bold.blue('Installation:')}
  ${chalk.dim('For bash:')}
  ${chalk.cyan('$')} ${chalk.green('kirox completion bash')} > ~/.kirox-completion.bash
  ${chalk.cyan('$')} echo "source ~/.kirox-completion.bash" >> ~/.bashrc

  ${chalk.dim('For zsh:')}
  ${chalk.cyan('$')} ${chalk.green('kirox completion zsh')} > ~/.kirox-completion.zsh
  ${chalk.cyan('$')} echo "source ~/.kirox-completion.zsh" >> ~/.zshrc

  ${chalk.dim('For fish:')}
  ${chalk.cyan('$')} ${chalk.green('kirox completion fish')} > ~/.config/fish/completions/kirox.fish

  ${chalk.dim('For PowerShell:')}
  ${chalk.cyan('PS>')} ${chalk.green('kirox completion powershell')} > ~/kirox-completion.ps1
  ${chalk.cyan('PS>')} echo ". ~/kirox-completion.ps1" >> $PROFILE

  ${chalk.dim('For Elvish:')}
  ${chalk.cyan('$')} ${chalk.green('kirox completion elvish')} > ~/.elvish/lib/kirox-completion.elv
  ${chalk.cyan('$')} echo "use ./kirox-completion" >> ~/.elvish/rc.elv
`)
    .allowExcessArguments(false);

  // Remove 'completion' from argv to parse correctly
  const completionIndex = argv.indexOf('completion');
  const completionArgv = [...argv.slice(0, completionIndex), ...argv.slice(completionIndex + 1)];

  // Avoid process.exit during tests (e.g., --help)
  if (process.env.NODE_ENV === 'test') {
    program.exitOverride();
  }

  program.parse(completionArgv);

  const shellType = program.args[0] || '';

  // Return ParsedArguments for completion command
  return {
    subcommand: 'completion',
    shellType,
    // Set defaults for unused fields
    repository: '',
    projects: [],
    output: '.',
    force: false,
    dryRun: false,
    verbose: false,
    track: false,
    checkUpdates: false,
    update: false,
    steering: false,
  };
}

/**
 * Parse 'add' subcommand arguments
 */
function parseAddCommand(argv: string[]): ParsedArguments {
  const program = new Command();

  applyCommandOptions(
    program
      .name('kirox add')
      .description('Add new projects to existing metadata')
      .argument('[repository]', 'GitHub repository in format "owner/repo" or "owner/repo#branch"'),
    addCommandOptions
  )
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

  // Avoid process.exit during tests (e.g., --help)
  if (process.env.NODE_ENV === 'test') {
    program.exitOverride();
  }

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
    track: boolean;
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
    track: options.track, // Use value from options (default: false)
    checkUpdates: false,
    update: false,
    subdir: options.subdir,
    steering: false,
  };
}

/**
 * Parse main command arguments (existing behavior)
 */
function parseMainCommand(argv: string[]): ParsedArguments {
  const program = new Command();

  applyCommandOptions(
    program
      .name('kirox')
      .description('CLI tool to fetch Kiro specification and steering files from remote GitHub repositories')
      .version(VERSION)
      .argument('[repository]', 'GitHub repository in format "owner/repo" or "owner/repo#branch"'),
    mainCommandOptions
  )
    .addHelpText('before', `${chalk.cyan(generateKiroxAsciiArt())}\n`)
    .addHelpText('after', `
${chalk.bold.blue('Interactive Mode:')}
  When run without arguments, kirox enters interactive mode and guides you
  through entering repository, project name, and other options step-by-step.

  ${chalk.green('$ npx kirox')}
  ${chalk.cyan('?')} 📦 Enter GitHub repository (owner/repo or owner/repo#branch): owner/repo
  ${chalk.cyan('?')} 📋 Enter project name: my-project
  ${chalk.cyan('?')} 📂 Enter output directory: .
  ${chalk.cyan('?')} 📁 Enter subdirectory in GitHub repository (optional):
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

  ${chalk.dim('# Fetch only steering directory')}
  ${chalk.green('$ npx kirox owner/repo --steering')}
  ${chalk.green('$ npx kirox owner/repo --subdir packages/api --steering')}

${chalk.bold.blue('Commands:')}
  ${chalk.cyan('add')}        Add new projects to existing metadata
               Use ${chalk.cyan('kirox add --help')} for detailed information

  ${chalk.cyan('completion')} Generate shell completion scripts
               Use ${chalk.cyan('kirox completion --help')} for detailed information

${chalk.bold.yellow('Note:')}
  • Branch specification: Use ${chalk.cyan('#')} after repository (e.g., ${chalk.cyan('owner/repo#develop')})
  • Multiple projects: Comma-separated list (e.g., ${chalk.cyan('-p proj1,proj2')})
  • Interactive mode is only available in TTY environments
`)
    .allowExcessArguments(false);

  // Avoid process.exit during tests (e.g., --help)
  if (process.env.NODE_ENV === 'test') {
    program.exitOverride();
  }

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
    steering: boolean;
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
    steering: options.steering,
  };
}
