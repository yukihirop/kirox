---
url: /kirox/cli/add.md
description: Subcommand to add projects
---

# add Command

Adds new projects to existing local projects.

## Syntax

```bash
npx kirox add [<owner/repo>[#branch]] [options]
```

## Overview

The `add` subcommand adds new projects to an existing `.kiro/` directory. The difference from the main command (`kirox`) is that it preserves existing steering files.

**Key Differences**:

* **`kirox`**: Fetches everything including steering files
* **`add`**: Adds only specified projects and preserves existing steering

## Arguments

### `<owner/repo>[#branch]`

Specify a GitHub repository (optional).

**Format**:

* `owner/repo`: Specify repository only (uses default branch)
* `owner/repo#branch`: Specify branch as well

**Examples**:

```bash
npx kirox add yukihirop/my-project -p new-project
npx kirox add yukihirop/my-project#develop -p new-project
```

**When omitted**: Interactive mode prompts for input

## Options

The `add` command supports the same options as the `kirox` command (except `--steering`).

### `-p, --project <projects>`

Specify project name(s) to add (comma-separated for multiple).

**Type**: `string`

**Examples**:

```bash
# Add single project
npx kirox add yukihirop/my-project -p new-project

# Add multiple projects
npx kirox add yukihirop/my-project -p project1,project2
```

### `-f, --force`

Overwrite existing files without confirmation.

**Type**: `boolean`
**Default**: `false`

**Example**:

```bash
npx kirox add yukihirop/my-project -p new-project --force
```

### `--dry-run`

Simulate file writing and display which files would be added.

**Type**: `boolean`
**Default**: `false`

**Example**:

```bash
npx kirox add yukihirop/my-project -p new-project --dry-run
```

### `--verbose`

Display detailed logs.

**Type**: `boolean`
**Default**: `false`

**Example**:

```bash
npx kirox add yukihirop/my-project -p new-project --verbose
```

### `--track`

Track changes in remote repository.

**Type**: `boolean`
**Default**: `false`

**Example**:

```bash
npx kirox add yukihirop/my-project -p new-project --track
```

### `--subdirectory <path>`

Fetch `.kiro/` files from a subdirectory within the repository.

**Type**: `string`

**Example**:

```bash
npx kirox add yukihirop/monorepo -p new-project --subdirectory backend
```

### `-c, --config <path>`

Specify configuration file path.

**Type**: `string`
**Default**: `.kiroxrc.json`

**Example**:

```bash
npx kirox add yukihirop/my-project -p new-project --config custom-config.json
```

### `-h, --help`

Display help message.

**Example**:

```bash
npx kirox add --help
```

## Interactive Mode

Run without arguments and options to configure interactively.

```bash
npx kirox add
```

**Prompts**:

1. **Repository input**: Enter in `owner/repo` format
2. **Branch selection**: Select from available branches with searchable checkbox (optional)
3. **Subdirectory selection**: Select from detected subdirectories (optional)
4. **Project selection**: Select from available projects with searchable checkbox (multiple selection available)

## Usage Examples

### Basic Usage

Add new project to existing local project:

```bash
# Current state
.kiro/
├── specs/
│   └── api-spec/
└── steering/

# Add new project
npx kirox add yukihirop/my-project -p web-spec

# After addition
.kiro/
├── specs/
│   ├── api-spec/     # Existing
│   └── web-spec/     # Newly added
└── steering/         # Unchanged
```

### Add Multiple Projects

```bash
npx kirox add yukihirop/my-project -p mobile-spec,infra-spec
```

### Add with Branch Specification

```bash
npx kirox add yukihirop/my-project#develop -p new-project
```

### Add from Subdirectory

```bash
npx kirox add yukihirop/monorepo -p new-project --subdirectory frontend
```

### Add in Interactive Mode

```bash
$ npx kirox add

? Enter repository: yukihirop/my-project
? Select branch (searchable): main
? Select subdirectory: (skip)
? Select projects (searchable, multiple selection):
  ☑ web-spec
  ☑ mobile-spec
  ☐ infra-spec
```

## Comparison with kirox Command

| Feature | `kirox` | `kirox add` |
|------|---------|-------------|
| Fetch steering | ✓ | ✗ |
| Add projects | ✓ | ✓ |
| Preserve existing steering | ✗ | ✓ |
| Use case | Initial setup | Fetch additional projects |

## Execution Flow

1. **Check existing `.kiro/` directory**: Warns if it doesn't exist
2. **Load configuration**: `.kiroxrc.json` or custom config file
3. **GitHub API authentication**: `GITHUB_TOKEN` environment variable (optional)
4. **Fetch repository information**: Branch, subdirectory, project list
5. **Fetch project files**: Fetch only specified projects
6. **Write files**: Save to local `.kiro/specs/`
7. **Display summary**: Show success/failure file counts

::: tip Tip
If the `.kiro/` directory doesn't exist, first perform initial setup with the `kirox` command.
:::

## Exit Codes

| Code | Description |
|-------|------|
| `0` | Success |
| `1` | Argument error |
| `2` | GitHub API error |
| `3` | Filesystem error |
| `4` | Configuration error |

## Related Pages

* [kirox command](/cli/kirox): Details on main command
* [Basic Usage](/guide/basic-usage): Basic command usage
* [Advanced Usage](/guide/advanced-usage): Configuration files, branch specification, subdirectory support
