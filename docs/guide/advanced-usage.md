---
title: Advanced Usage
description: Advanced features and configuration for Kirox CLI
---

# Advanced Usage

This guide explains the advanced features and configuration of Kirox CLI.

## Configuration File (.kiroxrc.json)

You can customize default settings by placing a `.kiroxrc.json` file in your project root.

### Creating a Configuration File

```json
{
  "defaultRepository": "yukihirop/my-project",
  "defaultProjects": ["api-spec", "web-spec"],
  "force": false,
  "verbose": false,
  "track": false
}
```

### Configuration Options

| Option | Type | Description |
|------|------|------|
| `defaultRepository` | `string` | Default repository (`owner/repo` format) |
| `defaultProjects` | `string[]` | List of default projects |
| `force` | `boolean` | Skip overwrite confirmation (default: `false`) |
| `verbose` | `boolean` | Display verbose logs (default: `false`) |
| `track` | `boolean` | Enable update tracking (default: `false`) |

### Priority Order

Configuration priority is as follows (higher takes precedence):

1. Command-line options
2. `.kiroxrc.json` configuration file
3. Environment variables
4. Default values

## Branch Specification

You can specify a repository branch to fetch files from.

### Branch Specification Syntax

```bash
npx kirox owner/repo#branch -p project-name
```

### Examples

```bash
# Fetch from develop branch
npx kirox yukihirop/my-project#develop -p api-spec

# Fetch from feature/new-feature branch
npx kirox yukihirop/my-project#feature/new-feature -p api-spec
```

### Branch Selection in Interactive Mode

In interactive mode, you can select from available branches with a searchable checkbox:

```bash
$ npx kirox

? Enter repository: yukihirop/my-project
? Select branch (searchable):
  ❯ ◯ main
    ◯ develop
    ◯ feature/new-feature
```

## Subdirectory Support

You can fetch `.kiro` files from subdirectories within a repository.

### Specifying a Subdirectory

```bash
npx kirox owner/repo -p project-name --subdirectory path/to/subdir
```

### Examples

```bash
# Fetch from backend directory in monorepo
npx kirox yukihirop/monorepo -p api-spec --subdirectory backend

# Fetch from both frontend and backend
npx kirox yukihirop/monorepo -p web-spec --subdirectory frontend
npx kirox yukihirop/monorepo -p api-spec --subdirectory backend
```

### Subdirectory Selection in Interactive Mode

In interactive mode, detected subdirectories are automatically suggested:

```bash
$ npx kirox

? Enter repository: yukihirop/monorepo
? Select subdirectory:
  ❯ ◯ backend
    ◯ frontend
    ◯ packages/core
```

## Managing Multiple Projects

### add Subcommand

Add new projects to an existing local project:

```bash
npx kirox add owner/repo -p new-project
```

Also available in interactive mode:

```bash
npx kirox add
```

### Project Suggestion Feature

In interactive mode, available projects in the repository are automatically detected and suggested:

```bash
$ npx kirox

? Enter repository: yukihirop/my-project
? Select projects (searchable, multiple selection):
  ❯ ☑ api-spec
    ☑ web-spec
    ☐ mobile-spec
    ☐ infra-spec
```

## Shell Completion

Support for shell completion in bash, zsh, fish, PowerShell, and elvish.

### Generating Completion Scripts

```bash
# bash
npx kirox completion bash > /etc/bash_completion.d/kirox

# zsh
npx kirox completion zsh > ~/.zsh/completion/_kirox

# fish
npx kirox completion fish > ~/.config/fish/completions/kirox.fish

# PowerShell
npx kirox completion powershell > kirox.ps1

# elvish
npx kirox completion elvish > ~/.elvish/lib/kirox.elv
```

### Enabling Completion

```bash
# bash
source /etc/bash_completion.d/kirox

# zsh (after running compinit)
source ~/.zsh/completion/_kirox

# fish
# Automatically loaded
```

## Environment Variables

### GITHUB_TOKEN

Used for GitHub API authentication:

```bash
export GITHUB_TOKEN=ghp_your_token_here
```

Required for accessing private repositories or relaxing rate limits.

### NODE_ENV

Specify the execution environment:

```bash
export NODE_ENV=development  # or production, test
```

### DEBUG

Enable debug logging:

```bash
export DEBUG=kirox:*
npx kirox owner/repo -p project-name
```

## Performance Optimization

### Parallel File Fetching

Kirox CLI fetches up to 5 files in parallel. This achieves approximately 80% time reduction when fetching large numbers of files.

### Rate Limit Handling

Automatically detects and responds to GitHub API rate limits:

- **Without authentication**: 60 requests/hour
- **With authentication**: 5,000 requests/hour

When fetching large numbers of files, it is recommended to set `GITHUB_TOKEN`.

## Next Steps

- [Troubleshooting](/guide/troubleshooting): Common issues and solutions
- [Configuration Reference](/config/kiroxrc): Detailed .kiroxrc.json configuration
- [API Specification](/api/): Kirox CLI API specification
