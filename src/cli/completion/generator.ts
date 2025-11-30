import type { SupportedShell } from './shell-validator.js';

export interface CompletionMetadata {
  
  programName: string;
  
  subcommands: Array<{
    name: string;
    description: string;
    options: Array<{ flag: string; description: string }>;
  }>;
  
  globalOptions: Array<{ flag: string; description: string }>;
}

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
      
      const _exhaustive: never = shell;
      throw new Error(`Unsupported shell: ${_exhaustive}`);
    }
  }
}

function generateBashScript(metadata: CompletionMetadata): string {
  const { programName, subcommands, globalOptions } = metadata;

  const subcommandNames = subcommands.map((sub) => sub.name).join(' ');

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

function generateZshScript(metadata: CompletionMetadata): string {
  const { programName, subcommands, globalOptions } = metadata;

  const subcommandDesc = subcommands
    .map((sub) => `    '${sub.name}:${sub.description}'`)
    .join('\n');

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

function generateFishScript(metadata: CompletionMetadata): string {
  const { programName, subcommands, globalOptions } = metadata;

  const subcommandLines = subcommands
    .map((sub) => `complete -c ${programName} -n "__fish_use_subcommand" -a "${sub.name}" -d "${sub.description}"`)
    .join('\n');

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

function generatePowerShellScript(metadata: CompletionMetadata): string {
  const { programName, subcommands, globalOptions } = metadata;

  const subcommandNames = subcommands.map((sub) => `'${sub.name}'`).join(', ');

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

function generateElvishScript(metadata: CompletionMetadata): string {
  const { programName, subcommands, globalOptions } = metadata;

  const subcommandNames = subcommands.map((sub) => sub.name).join(' ');

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

function extractFlags(flagString: string): string[] {
  
  const cleaned = flagString.replace(/\s+[<[].*?[>\]]/g, '');

  return cleaned.split(',').map((flag) => flag.trim());
}
