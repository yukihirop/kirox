#!/usr/bin/env node

/**
 * Kirox CLI - Entry Point
 *
 * CLI tool to fetch Kiro specification and steering files from remote GitHub repositories.
 */

import { parseArguments } from './cli/parser.js';

try {
  // Parse command-line arguments (this will handle --help, --version automatically)
  const args = parseArguments(process.argv);

  // TODO: Implement main CLI logic here
  console.log('Parsed arguments:', args);
  console.log('Kirox CLI - Implementation in progress');
} catch (error) {
  if (error instanceof Error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
  throw error;
}
