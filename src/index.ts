#!/usr/bin/env node

/**
 * Kirox CLI - Entry Point
 *
 * CLI tool to fetch Kiro specification and steering files from remote GitHub repositories.
 */

import { execute } from './cli/entry.js';
import { executeAddCommand } from './cli/add-command-entry.js';
import { executeCompletionCommand } from './cli/completion-command-entry.js';

/**
 * Subcommand Detection
 *
 * Detect subcommands in process.argv and route to appropriate command handler.
 * Subcommands must appear at index >= 2 (after 'node' and script path).
 *
 * Priority order (first match wins):
 * 1. 'add' -> executeAddCommand
 * 2. 'completion' -> executeCompletionCommand
 * 3. default -> execute (main command)
 */
const isAddCommand = process.argv.includes('add') && process.argv.indexOf('add') >= 2;
const isCompletionCommand =
  process.argv.includes('completion') && process.argv.indexOf('completion') >= 2;

// Route to appropriate command handler based on subcommand detection
const commandPromise = isAddCommand
  ? executeAddCommand(process.argv)
  : isCompletionCommand
    ? executeCompletionCommand(process.argv)
    : execute(process.argv);

// Execute command and handle result
commandPromise
  .then((result) => {
    process.exit(result.exitCode);
  })
  .catch((error) => {
    console.error('Unexpected error:', error);
    process.exit(2);
  });
