/**
 * Execution Mode Routing
 *
 * Task 4.4: Separated execution paths for interactive and non-interactive modes
 * Provides clear mode detection and routing logic
 */

import type { ParsedArguments } from './types.js';

/**
 * Execution mode types
 */
export type ExecutionMode = 'interactive' | 'non-interactive' | 'check-updates' | 'update';

/**
 * Determine execution mode based on parsed arguments
 *
 * Priority order:
 * 1. check-updates flag
 * 2. update flag
 * 3. interactive mode (missing repository or projects)
 * 4. non-interactive mode (default)
 *
 * @param args - Parsed command-line arguments
 * @returns Execution mode
 */
export function determineExecutionMode(args: ParsedArguments): ExecutionMode {
  if (args.checkUpdates) return 'check-updates';
  if (args.update) return 'update';

  if (!args.repository || args.projects.length === 0) {
    return 'interactive';
  }

  return 'non-interactive';
}
