export type SupportedShell = 'bash' | 'zsh' | 'fish' | 'powershell' | 'elvish';

interface ValidationResult {
  valid: boolean;
  normalizedShell?: SupportedShell;
  error?: string;
}

const SUPPORTED_SHELLS: readonly SupportedShell[] = ['bash', 'zsh', 'fish', 'powershell', 'elvish'];

function formatSupportedShells(): string {
  return SUPPORTED_SHELLS.join(', ');
}

export function validateShellType(shellType: string): ValidationResult {
  
  const normalized = shellType.trim().toLowerCase();

  if (!normalized) {
    return {
      valid: false,
      error: `Shell type is required. Supported shells: ${formatSupportedShells()}`,
    };
  }

  if (SUPPORTED_SHELLS.includes(normalized as SupportedShell)) {
    return {
      valid: true,
      normalizedShell: normalized as SupportedShell,
    };
  }

  return {
    valid: false,
    error: `Unsupported shell '${shellType}'. Supported shells: ${formatSupportedShells()}`,
  };
}

export function getSupportedShells(): SupportedShell[] {
  
  return [...SUPPORTED_SHELLS];
}
