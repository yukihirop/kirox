/**
 * Completion Script Generator
 *
 * Generates shell completion scripts based on metadata and shell type
 * Task 3.1: Generator implementation
 */

import type { SupportedShell } from './shell-validator.js';

/**
 * Metadata for completion script generation
 */
export interface CompletionMetadata {
  /** Program name (e.g., 'kirox') */
  programName: string;
  /** List of subcommands with their options */
  subcommands: Array<{
    name: string;
    description: string;
    options: Array<{ flag: string; description: string }>;
  }>;
  /** Global options available for all subcommands */
  globalOptions: Array<{ flag: string; description: string }>;
}

/**
 * Generate shell completion script
 *
 * @param shell - Target shell type
 * @param metadata - Completion metadata (program name, subcommands, options)
 * @returns Generated completion script
 *
 * Preconditions: shell must be a valid SupportedShell type
 * Postconditions: Returns non-empty completion script string
 * Invariants: Script includes program name and metadata
 *
 * @example
 * ```typescript
 * const metadata = {
 *   programName: 'kirox',
 *   subcommands: [{ name: 'add', description: 'Add project', options: [] }],
 *   globalOptions: [{ flag: '--help', description: 'Display help' }]
 * };
 * const script = generateCompletionScript('bash', metadata);
 * console.log(script);
 * ```
 */
export function generateCompletionScript(shell: SupportedShell, metadata: CompletionMetadata): string {
  switch (shell) {
    case 'bash':
      return generateBashScript(metadata);
    case 'zsh':
      return generateZshScript(metadata);
    case 'fish':
      return generateFishScript(metadata);
    case 'powershell':
      return generatePowerShellScript(metadata);
    case 'elvish':
      return generateElvishScript(metadata);
    default: {
      // TypeScript exhaustiveness check
      const _exhaustive: never = shell;
      throw new Error(`Unsupported shell: ${_exhaustive}`);
    }
  }
}

/**
 * Generate Bash completion script
 *
 * @param metadata - Completion metadata
 * @returns Bash completion script
 */
function generateBashScript(metadata: CompletionMetadata): string {
  const { programName, subcommands, globalOptions } = metadata;

  // Extract subcommand names
  const subcommandNames = subcommands.map((sub) => sub.name).join(' ');

  // Extract all option flags (global + subcommand-specific)
  const allOptions = new Set<string>();
  globalOptions.forEach((opt) => extractFlags(opt.flag).forEach((flag) => allOptions.add(flag)));
  subcommands.forEach((sub) => {
    sub.options.forEach((opt) => extractFlags(opt.flag).forEach((flag) => allOptions.add(flag)));
  });
  const optionFlags = Array.from(allOptions).join(' ');

  return `#!/usr/bin/env bash
# Bash completion script for ${programName}

_${programName}_completion() {
  local cur prev words cword
  _init_completion || return

  local subcommands="${subcommandNames}"
  local options="${optionFlags}"

  # If we're at the first argument position (no subcommand yet)
  if [[ \${cword} -eq 1 ]]; then
    COMPREPLY=( $(compgen -W "\${subcommands}" -- "\${cur}") )
    return
  fi

  # Complete options
  if [[ \${cur} == -* ]]; then
    COMPREPLY=( $(compgen -W "\${options}" -- "\${cur}") )
    return
  fi

  COMPREPLY=()
}

complete -F _${programName}_completion ${programName}
`;
}

/**
 * Generate Zsh completion script
 *
 * @param metadata - Completion metadata
 * @returns Zsh completion script
 */
function generateZshScript(metadata: CompletionMetadata): string {
  const { programName, subcommands, globalOptions } = metadata;

  // Build subcommand descriptions
  const subcommandDesc = subcommands
    .map((sub) => `    '${sub.name}:${sub.description}'`)
    .join('\n');

  // Build global option arguments
  const globalArgs = globalOptions
    .map((opt) => {
      const flags = extractFlags(opt.flag).join('[');
      return `    '${flags}[${opt.description}]'`;
    })
    .join('\n');

  return `#compdef ${programName}
# Zsh completion script for ${programName}

_${programName}() {
  local context state state_descr line
  typeset -A opt_args

  _arguments -C \\
${globalArgs}
    '1: :->subcommand' \\
    '*::arg:->args'

  case $state in
    subcommand)
      local subcommands
      subcommands=(
${subcommandDesc}
      )
      _describe 'subcommand' subcommands
      ;;
  esac
}

_${programName}
`;
}

/**
 * Generate Fish completion script
 *
 * @param metadata - Completion metadata
 * @returns Fish completion script
 */
function generateFishScript(metadata: CompletionMetadata): string {
  const { programName, subcommands, globalOptions } = metadata;

  // Generate subcommand completions
  const subcommandLines = subcommands
    .map((sub) => `complete -c ${programName} -n "__fish_use_subcommand" -a "${sub.name}" -d "${sub.description}"`)
    .join('\n');

  // Generate global option completions
  const globalOptionLines = globalOptions
    .map((opt) => {
      const flags = extractFlags(opt.flag);
      const shortFlag = flags.find((f) => f.startsWith('-') && !f.startsWith('--'));
      const longFlag = flags.find((f) => f.startsWith('--'));

      let line = `complete -c ${programName}`;
      if (shortFlag) line += ` -s ${shortFlag.replace(/^-/, '')}`;
      if (longFlag) line += ` -l ${longFlag.replace(/^--/, '')}`;
      line += ` -d "${opt.description}"`;
      return line;
    })
    .join('\n');

  return `# Fish completion script for ${programName}

# Subcommands
${subcommandLines}

# Global options
${globalOptionLines}
`;
}

/**
 * Generate PowerShell completion script
 *
 * @param metadata - Completion metadata
 * @returns PowerShell completion script
 */
function generatePowerShellScript(metadata: CompletionMetadata): string {
  const { programName, subcommands, globalOptions } = metadata;

  // Extract subcommand names
  const subcommandNames = subcommands.map((sub) => `'${sub.name}'`).join(', ');

  // Extract all option flags
  const allFlags = new Set<string>();
  globalOptions.forEach((opt) => extractFlags(opt.flag).forEach((flag) => allFlags.add(flag)));
  subcommands.forEach((sub) => {
    sub.options.forEach((opt) => extractFlags(opt.flag).forEach((flag) => allFlags.add(flag)));
  });
  const optionFlags = Array.from(allFlags)
    .map((flag) => `'${flag}'`)
    .join(', ');

  return `# PowerShell completion script for ${programName}

Register-ArgumentCompleter -CommandName ${programName} -ScriptBlock {
  param($commandName, $wordToComplete, $commandAst, $fakeBoundParameters)

  $subcommands = @(${subcommandNames})
  $options = @(${optionFlags})

  # Complete subcommands
  if ($wordToComplete -notmatch '^-') {
    $subcommands | Where-Object { $_ -like "$wordToComplete*" } | ForEach-Object {
      [System.Management.Automation.CompletionResult]::new($_, $_, 'ParameterValue', $_)
    }
  }
  # Complete options
  else {
    $options | Where-Object { $_ -like "$wordToComplete*" } | ForEach-Object {
      [System.Management.Automation.CompletionResult]::new($_, $_, 'ParameterName', $_)
    }
  }
}
`;
}

/**
 * Generate Elvish completion script
 *
 * @param metadata - Completion metadata
 * @returns Elvish completion script
 */
function generateElvishScript(metadata: CompletionMetadata): string {
  const { programName, subcommands, globalOptions } = metadata;

  // Extract subcommand names
  const subcommandNames = subcommands.map((sub) => sub.name).join(' ');

  // Extract all option flags
  const allFlags = new Set<string>();
  globalOptions.forEach((opt) => extractFlags(opt.flag).forEach((flag) => allFlags.add(flag)));
  subcommands.forEach((sub) => {
    sub.options.forEach((opt) => extractFlags(opt.flag).forEach((flag) => allFlags.add(flag)));
  });
  const optionFlags = Array.from(allFlags).join(' ');

  return `# Elvish completion script for ${programName}

set edit:completion:arg-completer[${programName}] = {|@args|
  fn has-subcommand {
    for arg $args {
      if (and (not (has-prefix $arg '-')) (not-eq $arg '${programName}')) {
        put $true
        return
      }
    }
    put $false
  }

  # Complete subcommands if no subcommand yet
  if (not (has-subcommand)) {
    put ${subcommandNames}
    return
  }

  # Complete options
  put ${optionFlags}
}
`;
}

/**
 * Extract individual flags from flag string
 *
 * Examples:
 * - "-h, --help" → ["-h", "--help"]
 * - "--verbose" → ["--verbose"]
 * - "-p, --project <name>" → ["-p", "--project"]
 *
 * @param flagString - Flag string from metadata
 * @returns Array of individual flags
 */
function extractFlags(flagString: string): string[] {
  // Remove parameter placeholders like <name>, [value], etc.
  const cleaned = flagString.replace(/\s+[<[].*?[>\]]/g, '');

  // Split by comma and trim
  return cleaned.split(',').map((flag) => flag.trim());
}
