/**
 * Completion Command Entry Point
 *
 * Main execution logic for the 'completion' subcommand
 * Task 1.3: CompletionEntry (execution entry point) implementation
 * Task 2.2: Validation error handling with ShellValidator integration
 * Task 3.1: Generator integration for actual script generation
 */

import { parseArguments } from './parser.js';
import { validateShellType } from './completion/shell-validator.js';
import { generateCompletionScript, type CompletionMetadata } from './completion/generator.js';
import type { ExecutionResult } from './types.js';

/**
 * Execute completion command with provided arguments
 *
 * Orchestrates the complete flow for shell completion script generation:
 * 1. Parse arguments (shell type)
 * 2. Validate shell type
 * 3. Generate completion script (placeholder for now)
 * 4. Output to stdout
 *
 * @param argv - Command-line arguments (e.g., ['node', 'kirox', 'completion', 'bash'])
 * @returns Execution result with success status and exit code
 *
 * @example
 * ```typescript
 * const result = await executeCompletionCommand(['node', 'kirox', 'completion', 'bash']);
 * console.log(`Success: ${result.success}`);
 * ```
 */
export async function executeCompletionCommand(argv: string[]): Promise<ExecutionResult> {
  try {
    // Step 1: Parse arguments using Parser from task 1.2
    const parsed = parseArguments(argv);

    // Step 2: Extract shell type
    const shellType = parsed.shellType || '';

    // Step 3: Validate shell type using ShellValidator (task 2.1)
    const validationResult = validateShellType(shellType);

    if (!validationResult.valid) {
      // Validation failed - output error to stderr
      console.error(validationResult.error);
      return createErrorResult();
    }

    // Validation succeeded - use normalized shell
    const normalizedShell = validationResult.normalizedShell!;

    // Step 4: Build completion metadata
    const metadata = buildKiroxMetadata();

    // Step 5: Generate completion script using Generator (task 3.1)
    const completionScript = generateCompletionScript(normalizedShell, metadata);

    // Step 6: Output to stdout
    console.log(completionScript);

    return {
      success: true,
      filesDownloaded: 0,
      filesFailed: 0,
      exitCode: 0,
    };
  } catch (error) {
    // Handle parser errors or other exceptions
    console.error('Error: Failed to execute completion command.');
    if (error instanceof Error) {
      console.error(error.message);
    }
    return {
      success: false,
      filesDownloaded: 0,
      filesFailed: 0,
      exitCode: 1,
    };
  }
}

/**
 * Create error ExecutionResult
 *
 * @returns ExecutionResult with error state
 */
function createErrorResult(): ExecutionResult {
  return {
    success: false,
    filesDownloaded: 0,
    filesFailed: 0,
    exitCode: 1,
  };
}

/**
 * Build Kirox CLI completion metadata
 *
 * Constructs metadata containing all Kirox subcommands and their options.
 * This metadata is used by the Generator to create shell-specific completion scripts.
 *
 * @returns CompletionMetadata for Kirox CLI
 *
 * Task 3.2: Build completion candidate metadata (partial implementation)
 * Full implementation will be completed in task 3.2
 */
function buildKiroxMetadata(): CompletionMetadata {
  return {
    programName: 'kirox',
    subcommands: [
      {
        name: 'add',
        description: 'Add a new project from a remote repository',
        options: [
          { flag: '-p, --project <name>', description: 'Project name to add' },
          { flag: '--track', description: 'Enable update tracking for this project' },
          { flag: '--force', description: 'Force overwrite existing project' },
          { flag: '--dry-run', description: 'Preview without executing' },
          { flag: '--verbose', description: 'Verbose output' },
        ],
      },
      {
        name: 'completion',
        description: 'Generate shell completion script',
        options: [
          { flag: '-h, --help', description: 'Display help for completion command' },
        ],
      },
    ],
    globalOptions: [
      { flag: '-h, --help', description: 'Display help information' },
      { flag: '-V, --version', description: 'Output version number' },
    ],
  };
}
