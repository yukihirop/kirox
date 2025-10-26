---
url: /kirox/cli.md
description: Reference for Kirox CLI commands
---

# CLI Reference

Reference for all Kirox CLI commands and options.

## Command List

### [kirox](/cli/kirox)

Main command. Fetches `.kiro/` files from GitHub repositories.

```bash
npx kirox <owner/repo> [options]
```

### [add](/cli/add)

Adds new projects to existing local projects.

```bash
npx kirox add <owner/repo> [options]
```

### [completion](/cli/completion)

Outputs shell completion scripts.

```bash
npx kirox completion <shell>
```

## Global Options

Options available for all commands:

| Option | Short | Description |
|-----------|--------|------|
| `--help` | `-h` | Display help |
| `--version` | `-V` | Display version |

## Common Options

Options available for `kirox` and `add` commands:

| Option | Short | Type | Description |
|-----------|--------|------|------|
| `--project` | `-p` | `string` | Project name(s) (comma-separated for multiple) |
| `--force` | `-f` | `boolean` | Skip overwrite confirmation |
| `--dry-run` | | `boolean` | Simulate file writing |
| `--verbose` | | `boolean` | Display detailed logs |
| `--track` | | `boolean` | Enable update tracking |
| `--steering` | | `boolean` | Fetch steering only |
| `--subdirectory` | | `string` | Subdirectory path |
| `--config` | `-c` | `string` | Configuration file path |

## Usage Examples

### Basic Usage

```bash
# Fetch specific project
npx kirox yukihirop/my-project -p api-spec

# Interactive mode
npx kirox

# Display help
npx kirox --help
```

### With Options

```bash
# Fetch multiple projects
npx kirox yukihirop/my-project -p api-spec,web-spec

# Specify branch
npx kirox yukihirop/my-project#develop -p api-spec

# No confirmation
npx kirox yukihirop/my-project -p api-spec --force

# Dry run
npx kirox yukihirop/my-project -p api-spec --dry-run

# Verbose logs
npx kirox yukihirop/my-project -p api-spec --verbose
```

### Subcommands

```bash
# Add project
npx kirox add yukihirop/my-project -p new-project

# Generate shell completion scripts
npx kirox completion bash > /etc/bash_completion.d/kirox
npx kirox completion zsh > ~/.zsh/completion/_kirox
npx kirox completion fish > ~/.config/fish/completions/kirox.fish
```

## Next Steps

* [kirox command](/cli/kirox): Details on main command
* [add command](/cli/add): Details on add subcommand
* [completion command](/cli/completion): Details on completion subcommand
