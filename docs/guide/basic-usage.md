---
title: Basic Usage
description: Basic commands and options for Kirox CLI
---

# Basic Usage

This guide explains the basic commands and options of Kirox CLI.

## Basic Commands

### Fetch Files from Repository

```bash
npx kirox <owner/repo> -p <project-name>
```

**Example**:
```bash
npx kirox yukihirop/my-project -p my-spec
```

This will fetch:
- All files under `.kiro/specs/my-spec/`
- All files under `.kiro/steering/`

### Interactive Mode

Running without options allows interactive configuration:

```bash
npx kirox
```

## Main Options

### Project Specification (`-p, --project`)

Specify the project(s) to fetch:

```bash
# Single project
npx kirox owner/repo -p project1

# Multiple projects (comma-separated)
npx kirox owner/repo -p project1,project2,project3
```

### Update Tracking (`--track`)

Track changes in the remote repository:

```bash
npx kirox owner/repo -p project1 --track
```

Default is `false`. When `--track` is specified, only changed files will be fetched on subsequent runs.

### Fetch Steering Only (`--steering`)

Fetch only `.kiro/steering/` and skip project specifications:

```bash
npx kirox owner/repo --steering
```

### Skip Overwrite Confirmation (`-f, --force`)

Overwrite existing files without confirmation:

```bash
npx kirox owner/repo -p project1 --force
```

::: warning Warning
The `--force` option overwrites existing files without warning. Use with caution.
:::

### Dry Run (`--dry-run`)

Preview which files would be fetched without actually writing them:

```bash
npx kirox owner/repo -p project1 --dry-run
```

### Verbose Logging (`--verbose`)

Display detailed logs:

```bash
npx kirox owner/repo -p project1 --verbose
```

## Usage Examples

### Basic Fetch

```bash
$ npx kirox yukihirop/my-project -p api-spec

✓ Fetching files from yukihirop/my-project...
✓ [1/5] requirements.md
✓ [2/5] design.md
✓ [3/5] tasks.md
✓ [4/5] spec.json
✓ [5/5] steering/tech.md

Summary:
  Succeeded: 5 files
  Failed: 0 files
```

### Fetch Multiple Projects

```bash
$ npx kirox yukihirop/my-project -p api-spec,web-spec

✓ Fetching files from yukihirop/my-project...
✓ Project: api-spec (5 files)
✓ Project: web-spec (4 files)

Summary:
  Succeeded: 9 files
  Failed: 0 files
```

### Preview with Dry Run

```bash
$ npx kirox yukihirop/my-project -p api-spec --dry-run

[DRY RUN] The following files would be fetched:
  .kiro/specs/api-spec/requirements.md
  .kiro/specs/api-spec/design.md
  .kiro/specs/api-spec/tasks.md
  .kiro/specs/api-spec/spec.json
  .kiro/steering/tech.md

No files were written (dry run mode).
```

## Display Help

Display command help:

```bash
npx kirox --help
```

Display subcommand help:

```bash
npx kirox add --help
npx kirox completion --help
```

## Next Steps

- [Advanced Usage](/guide/advanced-usage): Configuration files, branch specification, subdirectory support
- [CLI Reference](/cli/): Details on all commands and options
- [Troubleshooting](/guide/troubleshooting): Common issues and solutions
