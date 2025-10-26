---
url: /kirox/cli/kirox.md
description: Kirox CLI main command
---

# kirox Command

Fetches files from `.kiro/specs/` and `.kiro/steering/` in GitHub repositories.

## Syntax

```bash
npx kirox [<owner/repo>[#branch]] [options]
```

## Arguments

### `<owner/repo>[#branch]`

Specify a GitHub repository (optional).

**Format**:

* `owner/repo`: Specify repository only (uses default branch)
* `owner/repo#branch`: Specify branch as well

**Examples**:

```bash
npx kirox yukihirop/my-project
npx kirox yukihirop/my-project#develop
npx kirox yukihirop/my-project#feature/new-feature
```

**When omitted**: Interactive mode prompts for input

## Options

### `-p, --project <projects>`

Specify project name(s) to fetch (comma-separated for multiple).

**Type**: `string`

**Examples**:

```bash
# Single project
npx kirox yukihirop/my-project -p api-spec

# Multiple projects
npx kirox yukihirop/my-project -p api-spec,web-spec,mobile-spec
```

**When omitted**:

* Non-interactive mode: Error (except when using `--steering` option)
* Interactive mode: Auto-detect and suggest available projects

### `--track`

Track changes in remote repository.

**Type**: `boolean`
**Default**: `false`

**Behavior**:

* First run: Fetch all files and save metadata
* Subsequent runs: Fetch only changed files

**Example**:

```bash
npx kirox yukihirop/my-project -p api-spec --track
```

### `--steering`

Fetch only `.kiro/steering/` and skip project specifications.

**Type**: `boolean`
**Default**: `false`

**Example**:

```bash
npx kirox yukihirop/my-project --steering
```

::: tip Tip
Useful when you only want to fetch steering information shared across the team.
:::

### `-f, --force`

Overwrite existing files without confirmation.

**Type**: `boolean`
**Default**: `false`

**Example**:

```bash
npx kirox yukihirop/my-project -p api-spec --force
```

::: warning Warning
The `--force` option overwrites existing files without warning. Use with caution.
:::

### `--dry-run`

Simulate file writing and display which files would be fetched.

**Type**: `boolean`
**Default**: `false`

**Example**:

```bash
npx kirox yukihirop/my-project -p api-spec --dry-run
```

**Sample Output**:

```
[DRY RUN] The following files would be fetched:
  .kiro/specs/api-spec/requirements.md
  .kiro/specs/api-spec/design.md
  .kiro/specs/api-spec/tasks.md
  .kiro/specs/api-spec/spec.json
  .kiro/steering/tech.md
```

### `--verbose`

Display detailed logs.

**Type**: `boolean`
**Default**: `false`

**Example**:

```bash
npx kirox yukihirop/my-project -p api-spec --verbose
```

**Sample Output**:

```
[DEBUG] Loading config from .kiroxrc.json
[DEBUG] Fetching repository: yukihirop/my-project
[DEBUG] Branch: main
[DEBUG] Project: api-spec
[INFO] Fetching .kiro/specs/api-spec/requirements.md...
[INFO] Fetched 1024 bytes
```

### `--subdirectory <path>`

Fetch `.kiro/` files from a subdirectory within the repository.

**Type**: `string`

**Examples**:

```bash
# Fetch from backend directory in monorepo
npx kirox yukihirop/monorepo -p api-spec --subdirectory backend

# Nested subdirectory
npx kirox yukihirop/monorepo -p api-spec --subdirectory packages/core
```

### `-c, --config <path>`

Specify configuration file path.

**Type**: `string`
**Default**: `.kiroxrc.json`

**Example**:

```bash
npx kirox yukihirop/my-project -p api-spec --config custom-config.json
```

### `-h, --help`

Display help message.

**Example**:

```bash
npx kirox --help
```

### `-V, --version`

Display Kirox CLI version.

**Example**:

```bash
npx kirox --version
```

## Interactive Mode

Run without arguments and options to configure interactively.

```bash
npx kirox
```

**Prompts**:

1. **Repository input**: Enter in `owner/repo` format
2. **Branch selection**: Select from available branches with searchable checkbox (optional)
3. **Subdirectory selection**: Select from detected subdirectories (optional)
4. **Project selection**: Select from available projects with searchable checkbox (multiple selection available)

## Usage Examples

### Basic Usage

```bash
# Fetch specific project
npx kirox yukihirop/my-project -p api-spec
```

### Specify Branch

```bash
# Fetch from develop branch
npx kirox yukihirop/my-project#develop -p api-spec

# Fetch from feature/new-feature branch
npx kirox yukihirop/my-project#feature/new-feature -p api-spec
```

### Multiple Projects

```bash
# Fetch multiple projects
npx kirox yukihirop/my-project -p api-spec,web-spec,mobile-spec
```

### Subdirectory

```bash
# Fetch from backend directory in monorepo
npx kirox yukihirop/monorepo -p api-spec --subdirectory backend
```

### Option Combinations

```bash
# Dry run + verbose logs
npx kirox yukihirop/my-project -p api-spec --dry-run --verbose

# Force overwrite + update tracking
npx kirox yukihirop/my-project -p api-spec --force --track

# Steering only + custom config file
npx kirox yukihirop/my-project --steering --config team-config.json
```

## Execution Flow

1. **Load configuration**: `.kiroxrc.json` or custom config file
2. **GitHub API authentication**: `GITHUB_TOKEN` environment variable (optional)
3. **Fetch repository information**: Branch, subdirectory, project list
4. **Fetch files**: Fetch files in parallel (max 5 concurrent)
5. **Write files**: Save to local `.kiro/` directory
6. **Display summary**: Show success/failure file counts

## Environment Variables

### GITHUB\_TOKEN

Used for GitHub API authentication.

```bash
export GITHUB_TOKEN=ghp_your_token_here
```

Required for accessing private repositories or relaxing rate limits.

## Exit Codes

| Code | Description |
|-------|------|
| `0` | Success |
| `1` | Argument error |
| `2` | GitHub API error |
| `3` | Filesystem error |
| `4` | Configuration error |

## Related Pages

* [Basic Usage](/guide/basic-usage): Basic command usage
* [Advanced Usage](/guide/advanced-usage): Configuration files, branch specification, subdirectory support
* [Troubleshooting](/guide/troubleshooting): Common issues and solutions
