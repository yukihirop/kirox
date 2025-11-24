/**
 * Parser Configuration
 *
 * Declarative configuration objects for Commander.js options
 * Centralized option definitions for main command, add subcommand, and completion subcommand
 */

/**
 * Command option definition
 */
export interface CommandOption {
  flags: string;
  description: string;
  defaultValue?: string | boolean;
}

/**
 * Completion command configuration
 */
export interface CompletionCommandConfig {
  name: string;
  description: string;
  argument?: {
    syntax: string;
    description: string;
  };
}

/**
 * Main command options
 */
export const mainCommandOptions: CommandOption[] = [
  {
    flags: '-p, --project <name>',
    description: 'Project name to fetch (comma-separated for multiple projects)',
  },
  {
    flags: '-o, --output <path>',
    description: 'Output directory (default: current directory)',
    defaultValue: '.',
  },
  {
    flags: '-s, --subdir <path>',
    description: 'Subdirectory path containing .kiro folder',
  },
  {
    flags: '--force',
    description: 'Force overwrite without confirmation',
    defaultValue: false,
  },
  {
    flags: '--dry-run',
    description: 'Dry-run mode (no actual writes)',
    defaultValue: false,
  },
  {
    flags: '--verbose',
    description: 'Verbose logging',
    defaultValue: false,
  },
  {
    flags: '--config <path>',
    description: 'Custom config file path',
  },
  {
    flags: '--track',
    description: 'Track fetched files for update detection',
    defaultValue: false,
  },
  {
    flags: '--check-updates',
    description: 'Check for updates to tracked files',
    defaultValue: false,
  },
  {
    flags: '--update',
    description: 'Apply updates to tracked files',
    defaultValue: false,
  },
  {
    flags: '--steering',
    description: 'Fetch only .kiro/steering directory (skip project specs)',
    defaultValue: false,
  },
];

/**
 * Add subcommand options
 */
export const addCommandOptions: CommandOption[] = [
  {
    flags: '-p, --project <name>',
    description: 'Project names - comma-separated for multiple projects',
  },
  {
    flags: '-o, --output <path>',
    description: 'Output directory (default: current directory)',
    defaultValue: '.',
  },
  {
    flags: '-s, --subdir <path>',
    description: 'Subdirectory path containing .kiro folder',
  },
  {
    flags: '--force',
    description: 'Overwrite existing projects',
    defaultValue: false,
  },
  {
    flags: '--dry-run',
    description: 'Dry-run mode (no actual writes)',
    defaultValue: false,
  },
  {
    flags: '--verbose',
    description: 'Verbose logging',
    defaultValue: false,
  },
  {
    flags: '--config <path>',
    description: 'Custom config file path',
  },
  {
    flags: '--track',
    description: 'Track fetched files in metadata for update detection',
    defaultValue: false,
  },
];

/**
 * Completion command configuration
 */
export const completionCommandConfig: CompletionCommandConfig = {
  name: 'kirox completion',
  description: 'Generate shell completion script',
  argument: {
    syntax: '[shell]',
    description: 'Shell type: bash, zsh, fish, powershell, elvish',
  },
};

/**
 * Apply command options to Commander.js Command instance
 *
 * @param command - Commander.js Command instance
 * @param options - Array of CommandOption definitions
 * @returns The Command instance with options applied (for chaining)
 */
export function applyCommandOptions(
  command: import('commander').Command,
  options: CommandOption[]
): import('commander').Command {
  options.forEach((opt) => {
    if (opt.defaultValue !== undefined) {
      command.option(opt.flags, opt.description, opt.defaultValue);
    } else {
      command.option(opt.flags, opt.description);
    }
  });
  return command;
}
