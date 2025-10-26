---
title: Troubleshooting
description: Common issues and solutions
---

# Troubleshooting

This guide explains potential issues when using Kirox CLI and their solutions.

## Installation and Execution

### Node.js Version Error

**Error Message**:
```
Error: Kirox requires Node.js 18.0.0 or higher
```

**Cause**: Node.js version is outdated

**Solution**:
```bash
# Check Node.js version
node --version

# Upgrade to Node.js 18 or higher
# Download the latest version from https://nodejs.org/

# Using nvm
nvm install 18
nvm use 18
```

### npx Command Not Found

**Error Message**:
```
command not found: npx
```

**Cause**: npm is outdated or not installed

**Solution**:
```bash
# Check npm version
npm --version

# Upgrade npm
npm install -g npm@latest
```

## GitHub API Related

### Rate Limit Error

**Error Message**:
```
Error: GitHub API rate limit exceeded
```

**Cause**: Reached GitHub API rate limit (without authentication: 60 requests/hour)

**Solution**:

1. Set GitHub Personal Access Token (PAT):
```bash
export GITHUB_TOKEN=ghp_your_token_here
```

2. After configuration, rate limit is relaxed to 5,000 requests/hour

3. Check current rate limit status:
```bash
npx kirox owner/repo -p project --verbose
```

### Authentication Error

**Error Message**:
```
Error: Bad credentials
```

**Cause**: Invalid GitHub Personal Access Token

**Solution**:

1. Verify PAT is correct:
```bash
echo $GITHUB_TOKEN
```

2. Verify PAT scope (requires `public_repo` or `repo`)

3. Generate a new PAT:
   - [GitHub Settings → Developer settings → Personal access tokens](https://github.com/settings/tokens)

### Repository Not Found

**Error Message**:
```
Error: Repository not found: owner/repo
```

**Cause**: Repository does not exist or no access permission

**Solution**:

1. Verify repository name spelling
2. For private repositories, set `GITHUB_TOKEN`
3. Verify access permissions to the repository

## File Fetching Related

### File Not Found

**Error Message**:
```
Warning: .kiro/specs/project-name/ not found in repository
```

**Cause**: Specified project does not exist in the repository

**Solution**:

1. Verify project name spelling
2. Check branch (may exist in a different branch):
```bash
npx kirox owner/repo#develop -p project-name
```

3. Check subdirectory (for monorepos):
```bash
npx kirox owner/repo -p project-name --subdirectory path/to/subdir
```

4. Check available projects in the repository:
```bash
# Auto-detect in interactive mode
npx kirox
```

### File Size Limit Error

**Error Message**:
```
Error: File too large (max 1MB via GitHub API)
```

**Cause**: GitHub's Content API cannot fetch files larger than 1MB

**Solution**:

1. Check file size and split if necessary
2. Do not include large binary files in the `.kiro/` directory
3. When using Git LFS, fetching via API may be difficult

## Local Filesystem Related

### Write Permission Error

**Error Message**:
```
Error: EACCES: permission denied
```

**Cause**: No write permission to the directory

**Solution**:

1. Check directory permissions:
```bash
ls -la .kiro/
```

2. Correct permissions:
```bash
chmod -R u+w .kiro/
```

3. Running with sudo is not recommended (security risk)

### Existing File Overwrite Confirmation

**Behavior**: Asked to confirm overwriting existing files

**Solutions**:

1. Select in confirmation prompt:
   - `y`: Overwrite
   - `n`: Skip
   - `a`: Overwrite all

2. Skip confirmation (`--force` option):
```bash
npx kirox owner/repo -p project --force
```

::: warning Warning
The `--force` option overwrites existing files without warning.
:::

3. Preview beforehand with dry run:
```bash
npx kirox owner/repo -p project --dry-run
```

## Network Related

### Timeout Error

**Error Message**:
```
Error: Request timeout
```

**Cause**: Network connection is slow or unstable

**Solution**:

1. Check internet connection
2. Check firewall or proxy settings
3. Retry:
```bash
npx kirox owner/repo -p project
```

### Proxy Configuration

When accessing GitHub API through a proxy:

```bash
# HTTP proxy
export HTTP_PROXY=http://proxy.example.com:8080
export HTTPS_PROXY=http://proxy.example.com:8080

# Authenticated proxy
export HTTP_PROXY=http://user:pass@proxy.example.com:8080
```

## Other Issues

### Unexpected Errors

**Solutions**:

1. Enable verbose logging:
```bash
npx kirox owner/repo -p project --verbose
```

2. Check debug logs:
```bash
DEBUG=kirox:* npx kirox owner/repo -p project
```

3. Use the latest version (npx automatically uses the latest)

4. If the issue persists, report an issue on the [GitHub repository](https://github.com/yukihirop/kirox/issues)

### Displaying Help

To get hints for problem-solving:

```bash
# General help
npx kirox --help

# Subcommand help
npx kirox add --help
npx kirox completion --help
```

## Further Support

- [GitHub Issues](https://github.com/yukihirop/kirox/issues): Bug reports and feature requests
- [GitHub Discussions](https://github.com/yukihirop/kirox/discussions): Questions and discussions
- [CLI Reference](/cli/): Details on commands and options
