import type { ParsedArguments } from './types.js';

export type ExecutionMode = 'interactive' | 'non-interactive' | 'check-updates' | 'update';

export function determineExecutionMode(args: ParsedArguments): ExecutionMode {
  if (args.checkUpdates) return 'check-updates';
  if (args.update) return 'update';

  if (!args.repository || args.projects.length === 0) {
    return 'interactive';
  }

  return 'non-interactive';
}
