import { parseArguments } from './parser.js';
import { validateShellType } from './completion/shell-validator.js';
import { generateCompletionScript, type CompletionMetadata } from './completion/generator.js';
import type { ExecutionResult } from './types.js';

export async function executeCompletionCommand(argv: string[]): Promise<ExecutionResult> {
  try {
    
    const parsed = parseArguments(argv);

    const shellType = parsed.shellType || '';

    const validationResult = validateShellType(shellType);

    if (!validationResult.valid) {
      
      console.error(validationResult.error);
      return createErrorResult();
    }

    const normalizedShell = validationResult.normalizedShell!;

    const metadata = buildKiroxMetadata();

    const completionScript = generateCompletionScript(normalizedShell, metadata);

    console.log(completionScript);

    return {
      success: true,
      filesDownloaded: 0,
      filesFailed: 0,
      exitCode: 0,
    };
  } catch (error) {
    
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

function createErrorResult(): ExecutionResult {
  return {
    success: false,
    filesDownloaded: 0,
    filesFailed: 0,
    exitCode: 1,
  };
}

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
