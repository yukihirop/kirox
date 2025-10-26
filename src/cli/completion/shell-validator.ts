/**
 * Shell Validator
 *
 * Validates and normalizes shell type for completion script generation
 * Task 2.1: ShellValidator implementation
 */

/**
 * Supported shell types for completion script generation
 */
export type SupportedShell = 'bash' | 'zsh' | 'fish' | 'powershell' | 'elvish';

/**
 * Result of shell type validation
 * @internal Internal type - not exported
 */
interface ValidationResult {
  valid: boolean;
  normalizedShell?: SupportedShell;
  error?: string;
}

/**
 * List of supported shells
 */
const SUPPORTED_SHELLS: readonly SupportedShell[] = ['bash', 'zsh', 'fish', 'powershell', 'elvish'];

/**
 * Format list of supported shells for error messages
 *
 * @returns Formatted string of supported shells
 */
function formatSupportedShells(): string {
  return SUPPORTED_SHELLS.join(', ');
}

/**
 * Validate and normalize shell type
 *
 * @param shellType - Shell name from user input
 * @returns Validation result with normalized shell name
 *
 * Preconditions: shellType is a string (may be empty or contain whitespace)
 * Postconditions: Returns valid=true if supported, with normalized shell name
 * Invariants: Normalized shell is always lowercase if valid
 *
 * @example
 * ```typescript
 * const result = validateShellType('BASH');
 * if (result.valid) {
 *   console.log(result.normalizedShell); // 'bash'
 * }
 * ```
 */
export function validateShellType(shellType: string): ValidationResult {
  // Normalize: trim whitespace and convert to lowercase
  const normalized = shellType.trim().toLowerCase();

  // Check for empty string
  if (!normalized) {
    return {
      valid: false,
      error: `Shell type is required. Supported shells: ${formatSupportedShells()}`,
    };
  }

  // Check if normalized shell is in supported list
  if (SUPPORTED_SHELLS.includes(normalized as SupportedShell)) {
    return {
      valid: true,
      normalizedShell: normalized as SupportedShell,
    };
  }

  // Unsupported shell
  return {
    valid: false,
    error: `Unsupported shell '${shellType}'. Supported shells: ${formatSupportedShells()}`,
  };
}

/**
 * Get list of supported shells
 *
 * @returns Array of supported shell names
 *
 * @example
 * ```typescript
 * const shells = getSupportedShells();
 * console.log(shells); // ['bash', 'zsh', 'fish', 'powershell', 'elvish']
 * ```
 */
export function getSupportedShells(): SupportedShell[] {
  // Return a new array to prevent external modification
  return [...SUPPORTED_SHELLS];
}
