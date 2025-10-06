#!/usr/bin/env node

/**
 * Kirox CLI - Entry Point
 *
 * CLI tool to fetch Kiro specification and steering files from remote GitHub repositories.
 */

import { execute } from './cli/entry.js';

// Execute main CLI logic
execute(process.argv)
  .then((result) => {
    process.exit(result.exitCode);
  })
  .catch((error) => {
    console.error('Unexpected error:', error);
    process.exit(2);
  });
