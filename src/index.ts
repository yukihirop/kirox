#!/usr/bin/env node

/**
 * Kirox CLI - Entry Point
 *
 * CLI tool to fetch Kiro specification and steering files from remote GitHub repositories.
 */

import { execute } from './cli/entry.js';
import { executeAddCommand } from './cli/add-command-entry.js';

// Detect if 'add' subcommand is present
const isAddCommand = process.argv.includes('add') && process.argv.indexOf('add') >= 2;

// Route to appropriate command handler
const commandPromise = isAddCommand
  ? executeAddCommand(process.argv)
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
