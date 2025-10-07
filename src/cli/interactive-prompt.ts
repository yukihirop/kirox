/**
 * Interactive Prompt Service
 *
 * Provides interactive prompts for missing CLI arguments
 * Task 3.1: 対話モード起動条件の実装
 * Task 4.1: リポジトリ入力プロンプトの実装
 * Task 4.2: プロジェクト名入力プロンプトの実装
 * Task 4.3: オプションパラメータ入力プロンプトの実装
 * Task 4.4: 確認プロンプトの実装
 */

import { input, confirm } from '@inquirer/prompts';
import type { ParsedArguments } from './types.js';
import { validateRepositoryFormat, validateProjectName } from './validator.js';

/**
 * Determine if interactive mode should be entered
 *
 * Interactive mode is triggered when:
 * 1. Repository or project name is missing
 * 2. Running in a TTY environment (process.stdin.isTTY is true)
 * 3. NOT using --check-updates or --update options
 *
 * @param args - Parsed command-line arguments
 * @returns true if interactive mode should be entered
 */
export function shouldEnterInteractiveMode(args: ParsedArguments): boolean {
  // Check if running in TTY environment
  if (!process.stdin.isTTY) {
    return false;
  }

  // Skip interactive mode for --check-updates and --update options
  // These options don't require repository/project arguments
  if (args.checkUpdates || args.update) {
    return false;
  }

  // Check if repository or project is missing
  const hasRepository = args.repository && args.repository.trim() !== '';
  const hasProject = args.project && args.project.trim() !== '';

  // Enter interactive mode if either is missing
  return !hasRepository || !hasProject;
}

/**
 * Prompt for repository input
 *
 * If a valid repository value is already provided, returns it immediately.
 * Otherwise, displays an interactive prompt with real-time validation.
 *
 * @param currentValue - Current repository value (may be empty or whitespace)
 * @returns Validated repository string in format "owner/repo" or "owner/repo#branch"
 */
export async function promptRepository(currentValue: string): Promise<string> {
  // Skip prompt if value is already provided (non-empty after trim)
  if (currentValue && currentValue.trim() !== '') {
    return currentValue;
  }

  // Display interactive prompt with validation
  return await input({
    message: 'GitHubリポジトリを入力してください (owner/repo)',
    validate: (value: string) => {
      const errors = validateRepositoryFormat(value);
      if (errors.length > 0) {
        // Return first error message, or fallback message if array is somehow empty
        return errors[0]?.message || 'Invalid repository format';
      }
      return true;
    },
  });
}

/**
 * Prompt for project name input
 *
 * If a valid project name is already provided, returns it immediately.
 * Otherwise, displays an interactive prompt with real-time validation.
 *
 * @param currentValue - Current project name value (may be empty or whitespace)
 * @returns Validated project name string
 */
export async function promptProject(currentValue: string): Promise<string> {
  // Skip prompt if value is already provided (non-empty after trim)
  if (currentValue && currentValue.trim() !== '') {
    return currentValue;
  }

  // Display interactive prompt with validation
  return await input({
    message: 'プロジェクト名を入力してください',
    validate: (value: string) => {
      const errors = validateProjectName(value);
      if (errors.length > 0) {
        // Return first error message, or fallback message if array is somehow empty
        return errors[0]?.message || 'Invalid project name';
      }
      return true;
    },
  });
}

/**
 * Prompt for output directory
 *
 * Displays an interactive prompt with default value ".".
 * User can press Enter to accept default or specify a custom path.
 *
 * @returns Output directory path (defaults to ".")
 */
export async function promptOutput(): Promise<string> {
  return await input({
    message: '出力ディレクトリを入力してください',
    default: '.',
  });
}

/**
 * Prompt for subdirectory path (optional)
 *
 * Displays an interactive prompt for optional subdirectory path.
 * If user provides an empty string or whitespace only, returns undefined.
 *
 * @returns Subdirectory path, or undefined if empty
 */
export async function promptSubdir(): Promise<string | undefined> {
  const value = await input({
    message: 'サブディレクトリを入力してください (オプション)',
    default: '',
  });

  // Return undefined if empty or whitespace only
  if (!value || value.trim() === '') {
    return undefined;
  }

  return value;
}

/**
 * Display execution summary and confirm execution
 *
 * Shows a summary of the configuration (repository, project, output, subdir)
 * and prompts user to confirm execution.
 *
 * @param args - Parsed command-line arguments
 * @returns true if user confirms, false otherwise
 */
export async function confirmExecution(args: ParsedArguments): Promise<boolean> {
  // Display summary header
  console.log('\n設定内容:');

  // Display repository
  console.log(`  リポジトリ: ${args.repository}`);

  // Display project name
  console.log(`  プロジェクト: ${args.project}`);

  // Display output directory
  console.log(`  出力先: ${args.output}`);

  // Display subdirectory if specified
  if (args.subdir) {
    console.log(`  サブディレクトリ: ${args.subdir}`);
  }

  // Show confirmation prompt with default: false
  return await confirm({
    message: 'この設定で実行しますか?',
    default: false,
  });
}

/**
 * Prompt for missing arguments and complete the parsed arguments
 *
 * This function orchestrates all interactive prompts in sequence:
 * 1. Repository (if missing)
 * 2. Project (if missing)
 * 3. Output directory (if not specified or is default value)
 * 4. Subdirectory (if not specified, optional)
 * 5. Confirmation (always prompt)
 *
 * @param args - Partially parsed arguments (may have missing required fields)
 * @returns Completed ParsedArguments with all required fields filled
 * @throws Error if user cancels the confirmation prompt
 */
export async function promptMissingArguments(
  args: ParsedArguments
): Promise<ParsedArguments> {
  // Create a copy to avoid mutating the input
  const completedArgs = { ...args };

  // 1. Prompt for repository if missing
  completedArgs.repository = await promptRepository(completedArgs.repository);

  // 2. Prompt for project if missing
  completedArgs.project = await promptProject(completedArgs.project);

  // 3. Prompt for output directory only if not already specified
  // Check if output is the default value or empty
  if (!completedArgs.output || completedArgs.output === '.') {
    completedArgs.output = await promptOutput();
  }

  // 4. Prompt for subdirectory only if not already specified
  if (!completedArgs.subdir) {
    const subdir = await promptSubdir();
    if (subdir) {
      completedArgs.subdir = subdir;
    }
  }

  // 5. Show confirmation prompt
  const confirmed = await confirmExecution(completedArgs);
  if (!confirmed) {
    throw new Error('処理を中断しました');
  }

  return completedArgs;
}
