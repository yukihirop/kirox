---
url: /kirox/guide/getting-started.md
description: Installation and initial setup for Kirox CLI
---

# Getting Started

This guide explains how to get started with Kirox CLI.

## Prerequisites

To use Kirox CLI, you need the following environment:

* **Node.js 18.0.0 or higher**: Download from [Node.js official website](https://nodejs.org/)
* **npm 9 or higher**: Included with Node.js
* **Git**: Version control tool (optional)

Verify versions:

```bash
node --version  # v18.0.0 or higher
npm --version   # 9.0.0 or higher
```

## Installation

Kirox CLI **does not require global installation** and can be run immediately with the npx command.

### Run with npx (Recommended)

```bash
npx kirox owner/repo -p project-name
```

This method is recommended as it always runs the latest version.

### Global Installation

If you use it frequently, you can install it globally:

```bash
npm install -g kirox
kirox owner/repo -p project-name
```

## First Run

### Basic Usage

Fetch specifications from a GitHub repository:

```bash
npx kirox yukihirop/my-project -p my-spec
```

### Interactive Mode

Running without options allows you to configure interactively:

```bash
npx kirox
```

Follow the prompts to enter:

1. GitHub repository (e.g., `yukihirop/my-project`)
2. Branch (optional)
3. Subdirectory (optional)
4. Project name (multiple selection available)

## GitHub Authentication (Optional)

To access private repositories or to relax GitHub API rate limits, set up a Personal Access Token (PAT).

### Obtaining a PAT

1. Go to [GitHub Settings → Developer settings → Personal access tokens](https://github.com/settings/tokens)
2. Click "Generate new token (classic)"
3. Select the following scopes:
   * `public_repo`: Read public repositories
   * `repo`: Read private repositories (if needed)
4. Generate and copy the token

### Setting Environment Variables

```bash
# macOS / Linux
export GITHUB_TOKEN=ghp_your_token_here

# Windows (PowerShell)
$env:GITHUB_TOKEN="ghp_your_token_here"
```

To set permanently, add to `.bashrc`, `.zshrc`, or `.profile`:

```bash
echo 'export GITHUB_TOKEN=ghp_your_token_here' >> ~/.bashrc
source ~/.bashrc
```

## Verification

Verify that Kirox CLI is working correctly with the following command:

```bash
npx kirox --help
```

If the help message is displayed, the installation was successful.

## Next Steps

* [Basic Usage](/guide/basic-usage): Details on commands and options
* [Advanced Usage](/guide/advanced-usage): Configuration files and advanced features
* [CLI Reference](/cli/): Reference for all commands
