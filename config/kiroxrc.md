---
url: /kirox/config/kiroxrc.md
description: Kirox CLI configuration file reference
---

# .kiroxrc.json

Reference for the Kirox CLI configuration file.

## Overview

`.kiroxrc.json` is a configuration file that defines default behavior for Kirox CLI. By placing it in the project root, you can omit settings when executing commands.

## File Format

**Format**: JSON
**Location**: Project root
**Filename**: `.kiroxrc.json`

## Configuration Options

### defaultRepository

Specifies the default GitHub repository.

**Type**: `string`
**Format**: `owner/repo`
**Default**: None (not set)

**Example**:

```json
{
  "defaultRepository": "yukihirop/my-project"
}
```

**Behavior**: Used when the repository argument is omitted.

```bash
# With defaultRepository set
npx kirox -p api-spec
# => Fetches api-spec from yukihirop/my-project

# Without defaultRepository set
npx kirox -p api-spec
# => Error: Please specify repository
```

### defaultProjects

Specifies the default project list.

**Type**: `string[]`
**Default**: None (not set)

**Example**:

```json
{
  "defaultProjects": ["api-spec", "web-spec", "mobile-spec"]
}
```

**Behavior**: Used when the `--project` option is omitted.

```bash
# With defaultProjects set
npx kirox yukihirop/my-project
# => Fetches api-spec, web-spec, mobile-spec

# Without defaultProjects set
npx kirox yukihirop/my-project
# => Interactive mode for project selection
```

### force

Skips overwrite confirmation for existing files.

**Type**: `boolean`
**Default**: `false`

**Example**:

```json
{
  "force": true
}
```

**Behavior**:

* `true`: Overwrite existing files without confirmation
* `false`: Display confirmation prompt if existing files exist

::: warning Warning
`force: true` overwrites existing files without warning. Use with caution in production environments.
:::

### verbose

Displays detailed logs.

**Type**: `boolean`
**Default**: `false`

**Example**:

```json
{
  "verbose": true
}
```

**Behavior**:

* `true`: Display detailed logs
* `false`: Display normal logs only

**Log Example**:

```
[DEBUG] Loading config from .kiroxrc.json
[DEBUG] Fetching repository: yukihirop/my-project
[DEBUG] Branch: main
[INFO] Fetching .kiro/specs/api-spec/requirements.md...
```

### track

Enables update tracking.

**Type**: `boolean`
**Default**: `false`

**Example**:

```json
{
  "track": true
}
```

**Behavior**:

* `true`: Track remote repository changes and fetch only changed files
* `false`: Fetch all files every time

## Complete Configuration Examples

### Basic Configuration

```json
{
  "defaultRepository": "yukihirop/my-project",
  "defaultProjects": ["api-spec"],
  "force": false,
  "verbose": false,
  "track": false
}
```

### Team Development Configuration

Automatically fetch multiple projects and enable update tracking:

```json
{
  "defaultRepository": "company/shared-specs",
  "defaultProjects": ["backend-api", "frontend-web", "mobile-app"],
  "force": false,
  "verbose": true,
  "track": true
}
```

### CI/CD Configuration

Enable force overwrite and detailed logging:

```json
{
  "defaultRepository": "company/project",
  "defaultProjects": ["api-spec"],
  "force": true,
  "verbose": true,
  "track": false
}
```

### Personal Development Configuration

Simple configuration with force overwrite:

```json
{
  "defaultRepository": "username/my-project",
  "defaultProjects": ["main-spec"],
  "force": true,
  "verbose": false,
  "track": false
}
```

## Configuration Priority

Configuration is applied in the following priority order (higher takes precedence):

1. **Command-line options**
   ```bash
   npx kirox owner/repo -p project --force --verbose
   ```

2. **`.kiroxrc.json` configuration file**
   ```json
   { "force": false, "verbose": false }
   ```

3. **Environment variables**
   ```bash
   export GITHUB_TOKEN=ghp_...
   ```

4. **Default values**
   ```typescript
   { force: false, verbose: false, track: false }
   ```

## Custom Configuration File

To use a configuration file other than the default `.kiroxrc.json`:

```bash
npx kirox owner/repo -p project --config custom-config.json
```

**Custom configuration file example** (`team-config.json`):

```json
{
  "defaultRepository": "company/team-repo",
  "defaultProjects": ["team-spec"],
  "force": false,
  "verbose": true,
  "track": true
}
```

## Configuration File Validation

To verify the configuration file format is correct, run with the `--verbose` option:

```bash
npx kirox owner/repo -p project --verbose
```

**Sample Output**:

```
[DEBUG] Loading config from .kiroxrc.json
[DEBUG] Config loaded: { defaultRepository: 'yukihirop/my-project', ... }
```

## Troubleshooting

### Configuration File Not Loading

**Cause**: Filename spelling error or JSON format error

**Solution**:

1. Verify filename (`.kiroxrc.json`)
2. Validate JSON format:
   ```bash
   cat .kiroxrc.json | jq .
   ```

### Configuration Not Applied

**Cause**: Command-line options override configuration file

**Solution**:

1. Verify command-line options
2. Check configuration with `--verbose` option

### JSON Syntax Error

**Error Message**:

```
Error: Invalid JSON in .kiroxrc.json
```

**Solution**:

1. Validate with JSON linter
2. Check commas, brackets, quotes

## Best Practices

### Team Development

* Include `.kiroxrc.json` in version control
* Use common configuration across team
* Define project-specific settings

```json
{
  "defaultRepository": "company/shared-specs",
  "defaultProjects": ["backend-api", "frontend-web"],
  "track": true
}
```

### Personal Development

* Add `.kiroxrc.json` to `.gitignore` (for personal settings)
* Configure frequently used repositories and projects

```json
{
  "defaultRepository": "username/my-project",
  "defaultProjects": ["main-spec"],
  "force": true
}
```

### CI/CD Environment

* Enable force overwrite and detailed logging
* Disable update tracking (fetch clean state every time)

```json
{
  "force": true,
  "verbose": true,
  "track": false
}
```

## Related Pages

* [Configuration Guide](/config/): Configuration overview
* [Advanced Usage](/guide/advanced-usage): How to utilize configuration files
* [CLI Reference](/cli/): Details on commands and options
