---
title: completion Command
description: Shell completion script generation command
---

# completion Command

Outputs shell completion scripts. Supports bash, zsh, fish, PowerShell, and elvish.

## Syntax

```bash
npx kirox completion <shell>
```

## Arguments

### `<shell>`

Specify the shell type (required).

**Supported Shells**:
- `bash`
- `zsh`
- `fish`
- `powershell`
- `elvish`

## Usage

### bash

```bash
# Generate completion script
npx kirox completion bash > /etc/bash_completion.d/kirox

# Or place in user directory
npx kirox completion bash > ~/.bash_completion.d/kirox

# Enable
source /etc/bash_completion.d/kirox
# or
source ~/.bash_completion.d/kirox
```

**Persistence**: Add to `.bashrc`
```bash
if [ -f ~/.bash_completion.d/kirox ]; then
  source ~/.bash_completion.d/kirox
fi
```

### zsh

```bash
# Generate completion script
npx kirox completion zsh > ~/.zsh/completion/_kirox

# Add completion directory to fpath before compinit
# Add to .zshrc
fpath=(~/.zsh/completion $fpath)
autoload -Uz compinit && compinit
```

**With Oh My Zsh**:
```bash
# Place in Oh My Zsh custom plugin directory
mkdir -p ~/.oh-my-zsh/custom/plugins/kirox
npx kirox completion zsh > ~/.oh-my-zsh/custom/plugins/kirox/_kirox

# Add to plugins in .zshrc
plugins=(... kirox)
```

### fish

```bash
# Generate completion script
npx kirox completion fish > ~/.config/fish/completions/kirox.fish

# fish automatically loads completions
# Restart shell or run
source ~/.config/fish/completions/kirox.fish
```

### PowerShell

```bash
# Generate completion script
npx kirox completion powershell > kirox.ps1

# Add to profile
# Check profile path
echo $PROFILE

# Add completion script to profile
Add-Content $PROFILE ". path\to\kirox.ps1"

# Or write directly to profile
npx kirox completion powershell >> $PROFILE
```

### elvish

```bash
# Generate completion script
npx kirox completion elvish > ~/.elvish/lib/kirox.elv

# Add to rc.elv
use kirox
```

## Completion Content

Shell completion auto-completes the following:

### Commands

- `kirox`
- `add`
- `completion`

### Options

- `--project`, `-p`
- `--force`, `-f`
- `--dry-run`
- `--verbose`
- `--track`
- `--steering`
- `--subdirectory`
- `--config`, `-c`
- `--help`, `-h`
- `--version`, `-V`

### Shell Names (completion command)

- `bash`
- `zsh`
- `fish`
- `powershell`
- `elvish`

## Usage Examples

### Testing Completion

When completion is properly configured, it works as follows:

```bash
# Command completion
$ npx kirox [TAB]
add        completion

# Option completion
$ npx kirox --[TAB]
--project      --force        --dry-run
--verbose      --track        --steering
--subdirectory --config       --help
--version

# Shell name completion
$ npx kirox completion [TAB]
bash       zsh        fish
powershell elvish
```

## Troubleshooting

### Completion Not Working (bash)

**Check**:
1. Verify bash-completion is installed
```bash
# macOS (Homebrew)
brew install bash-completion

# Ubuntu/Debian
apt-get install bash-completion
```

2. Verify bash-completion is enabled (add to `.bashrc`)
```bash
if [ -f /etc/bash_completion ]; then
  . /etc/bash_completion
fi
```

3. Restart shell
```bash
exec bash
```

### Completion Not Working (zsh)

**Check**:
1. Verify compinit is executed (add to `.zshrc`)
```bash
autoload -Uz compinit && compinit
```

2. Verify completion directory is in fpath
```bash
echo $fpath
```

3. Reset completion cache
```bash
rm ~/.zcompdump*
exec zsh
```

### Completion Not Working (fish)

**Check**:
1. Verify completion file path is correct
```bash
ls ~/.config/fish/completions/kirox.fish
```

2. Restart fish
```bash
exec fish
```

## Manual Completion Setup

If automatic completion script generation doesn't work, you can set it up manually.

### bash (manual)

```bash
# Add to .bashrc
_kirox_completion() {
  local cur="${COMP_WORDS[COMP_CWORD]}"
  local prev="${COMP_WORDS[COMP_CWORD-1]}"

  case "${prev}" in
    kirox)
      COMPREPLY=( $(compgen -W "add completion --project --force --dry-run --verbose --track --steering --subdirectory --config --help --version" -- ${cur}) )
      return 0
      ;;
    completion)
      COMPREPLY=( $(compgen -W "bash zsh fish powershell elvish" -- ${cur}) )
      return 0
      ;;
  esac
}

complete -F _kirox_completion kirox
```

## Related Pages

- [kirox command](/cli/kirox): Details on main command
- [add command](/cli/add): Details on add subcommand
- [Getting Started](/guide/getting-started): Installation and initial setup
