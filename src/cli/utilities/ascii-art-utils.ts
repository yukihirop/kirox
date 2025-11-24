/**
 * ASCII Art Utilities
 *
 * Provides utilities for generating ASCII art using figlet
 */

import figlet from 'figlet';

/**
 * Generate ASCII art for kirox logo
 *
 * @returns ASCII art string for 'kirox' or fallback text if generation fails
 */
export function generateKiroxAsciiArt(): string {
  try {
    const result = figlet.textSync('kirox', {
      font: 'ANSI Shadow',
      horizontalLayout: 'default',
      verticalLayout: 'default',
    });

    if (!result || result.trim() === '') {
      return 'kirox\n';
    }

    return result;
  } catch (_error) {
    return 'kirox\n';
  }
}
