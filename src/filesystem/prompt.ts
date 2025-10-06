/**
 * Prompt Service
 *
 * Handles interactive user prompts for overwrite confirmation
 */

import { createInterface } from 'readline';

/**
 * Prompt user for confirmation
 *
 * Displays a yes/no prompt and waits for user input.
 * Accepts: y, Y, yes, YES (case-insensitive) for true
 * Anything else (including empty input) returns false
 *
 * @param message - Message to display to user
 * @returns Promise resolving to true if user confirms, false otherwise
 *
 * @example
 * ```typescript
 * const shouldOverwrite = await confirm('Overwrite existing file?');
 * if (shouldOverwrite) {
 *   // Write file
 * }
 * ```
 */
export async function confirm(message: string): Promise<boolean> {
  return new Promise((resolve) => {
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    rl.question(`${message} (y/N): `, (answer: string) => {
      rl.close();

      const normalized = answer.trim().toLowerCase();
      const isConfirmed = normalized === 'y' || normalized === 'yes';

      resolve(isConfirmed);
    });
  });
}
