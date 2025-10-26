---
title: Configuration
description: Kirox CLI configuration guide
---

# Configuration

This guide explains how to configure Kirox CLI.

## Configuration File

Kirox CLI can customize its behavior with a `.kiroxrc.json` file placed in the project root.

### [.kiroxrc.json](/config/kiroxrc)

Configuration file that defines project default settings.

**Location**: Project root

**Example**:
```json
{
  "defaultRepository": "yukihirop/my-project",
  "defaultProjects": ["api-spec", "web-spec"],
  "force": false,
  "verbose": false,
  "track": false
}
```

## Configuration Priority

Configuration is applied in the following priority order (higher takes precedence):

1. **Command-line options**: Options specified at runtime
2. **Configuration file**: `.kiroxrc.json` contents
3. **Environment variables**: `GITHUB_TOKEN`, etc.
4. **Default values**: Built-in default values

## Environment Variables

### GITHUB_TOKEN

Used for GitHub API authentication.

```bash
export GITHUB_TOKEN=ghp_your_token_here
```

**Purpose**:
- Access to private repositories
- Relax rate limits (60 → 5,000 requests/hour)

**How to Obtain**:
1. Go to [GitHub Settings → Developer settings → Personal access tokens](https://github.com/settings/tokens)
2. Click "Generate new token (classic)"
3. Select the following scopes:
   - `public_repo`: Read public repositories
   - `repo`: Read private repositories (if needed)

### NODE_ENV

Specifies the execution environment.

```bash
export NODE_ENV=development  # or production, test
```

**Effects**: Log level, error verbosity

### DEBUG

Enables debug logging.

```bash
export DEBUG=kirox:*
npx kirox owner/repo -p project-name
```

## Custom Configuration File

To use a configuration file other than the default `.kiroxrc.json`, specify it with the `--config` option.

```bash
npx kirox owner/repo -p project --config custom-config.json
```

## Configuration Examples

### Team Development Configuration

Configure repository shared across team:

```json
{
  "defaultRepository": "company/shared-specs",
  "defaultProjects": ["backend-api", "frontend-web"],
  "track": true,
  "verbose": false
}
```

### Personal Development Configuration

Configuration for personal projects:

```json
{
  "defaultRepository": "username/my-project",
  "defaultProjects": ["main-spec"],
  "force": true,
  "track": false
}
```

### CI/CD Environment Configuration

Configuration for CI/CD environments:

```json
{
  "defaultRepository": "company/project",
  "defaultProjects": ["api-spec"],
  "force": true,
  "verbose": true,
  "track": false
}
```

## Next Steps

- [.kiroxrc.json Reference](/config/kiroxrc): Details on configuration options
- [Advanced Usage](/guide/advanced-usage): How to utilize configuration files
