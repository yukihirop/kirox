#!/usr/bin/env node

import { execute } from './cli/entry.js';
import { executeAddCommand } from './cli/add-command-entry.js';
import { executeCompletionCommand } from './cli/completion-command-entry.js';

const isAddCommand = process.argv.includes('add') && process.argv.indexOf('add') >= 2;
const isCompletionCommand =
  process.argv.includes('completion') && process.argv.indexOf('completion') >= 2;

const commandPromise = isAddCommand
  ? executeAddCommand(process.argv)
  : isCompletionCommand
    ? executeCompletionCommand(process.argv)
    : execute(process.argv);

commandPromise
  .then((result) => {
    process.exit(result.exitCode);
  })
  .catch((error) => {
    console.error('Unexpected error:', error);
    process.exit(2);
  });
