# Kirox (♻️ Recycle `.kiro` CLI)

[![CI](https://github.com/yukihirop/kirox/actions/workflows/ci.yml/badge.svg)](https://github.com/yukihirop/kirox/actions/workflows/ci.yml)
[![Release](https://github.com/yukihirop/kirox/actions/workflows/release.yml/badge.svg)](https://github.com/yukihirop/kirox/actions/workflows/release.yml)

CLI tool to fetch Kiro specification and steering files from remote GitHub repositories.

## Features

- 💬 **Interactive Mode** - Guided prompts for easy usage (no arguments needed)
- 📦 Fetch Kiro specification and steering files from any GitHub repository
- 🌿 Branch/tag specification support (`owner/repo#branch`)
- 📁 Subdirectory support for monorepo structures
- 🚀 NPX support - no installation required
- 🔄 Automatic directory creation
- ✅ Overwrite confirmation prompts
- 🎨 Colorized output and progress indicators
- 🔍 Verbose logging for debugging
- 🏃 Dry-run mode to preview operations


```bash
npx kirox

✔ Enter GitHub repository (owner/repo or owner/repo#branch) yukihirop/eg-kanban#test
✔ Enter project name (comma-separated for multiple projects) simple-kanban-board-a,simple-kanban-board-b
✔ Enter output directory tmp
✔ Enter subdirectory in GitHub repository (optional) lib/a

Configuration:
  Repository: yukihirop/eg-kanban#test
  Project: simple-kanban-board-a, simple-kanban-board-b
  Output: tmp
  Subdirectory: lib/a
✔ Execute with this configuration? Yes
Fetching files from yukihirop/eg-kanban#test/lib/a/.kiro
Fetching 2 projects: simple-kanban-board-a, simple-kanban-board-b
Source: yukihirop/eg-kanban (branch: test)
[INFO] 2025-10-09T14:13:11 Fetching directory listings from GitHub {"repository":"yukihirop/eg-kanban#test","project":"simple-kanban-board-a","branch":"test"}
[INFO] 2025-10-09T14:13:12 Fetching file contents {"count":8}
[simple-kanban-board-a] [1/8] Fetching .kiro/specs/simple-kanban-board-a/design.md...
✓ Saved: .kiro/specs/simple-kanban-board-a/design.md
[simple-kanban-board-a] [2/8] Fetching .kiro/steering/product.md...
✓ Saved: .kiro/steering/product.md
[simple-kanban-board-a] [3/8] Fetching .kiro/specs/simple-kanban-board-a/tasks.md...
✓ Saved: .kiro/specs/simple-kanban-board-a/tasks.md
[simple-kanban-board-a] [4/8] Fetching .kiro/specs/simple-kanban-board-a/spec.json...
✓ Saved: .kiro/specs/simple-kanban-board-a/spec.json
[simple-kanban-board-a] [5/8] Fetching .kiro/specs/simple-kanban-board-a/requirements.md...
✓ Saved: .kiro/specs/simple-kanban-board-a/requirements.md
[simple-kanban-board-a] [6/8] Fetching .kiro/steering/tech.md...
✓ Saved: .kiro/steering/tech.md
[simple-kanban-board-a] [7/8] Fetching .kiro/steering/testing.md...
✓ Saved: .kiro/steering/testing.md
[simple-kanban-board-a] [8/8] Fetching .kiro/steering/structure.md...
✓ Saved: .kiro/steering/structure.md
✓ Saved metadata: .kiro/.kirox-meta.json
[simple-kanban-board-a] Completed: 8 files succeeded, 0 files failed
[INFO] 2025-10-09T14:13:13 Fetching directory listings from GitHub {"repository":"yukihirop/eg-kanban#test","project":"simple-kanban-board-b","branch":"test"}
[INFO] 2025-10-09T14:13:13 Fetching file contents {"count":4}
[simple-kanban-board-b] [1/4] Fetching .kiro/specs/simple-kanban-board-b/spec.json...
✓ Saved: .kiro/specs/simple-kanban-board-b/spec.json
[simple-kanban-board-b] [2/4] Fetching .kiro/specs/simple-kanban-board-b/requirements.md...
✓ Saved: .kiro/specs/simple-kanban-board-b/requirements.md
[simple-kanban-board-b] [3/4] Fetching .kiro/specs/simple-kanban-board-b/design.md...
✓ Saved: .kiro/specs/simple-kanban-board-b/design.md
[simple-kanban-board-b] [4/4] Fetching .kiro/specs/simple-kanban-board-b/tasks.md...
✓ Saved: .kiro/specs/simple-kanban-board-b/tasks.md
✓ Saved metadata: .kiro/.kirox-meta.json
[simple-kanban-board-b] Completed: 4 files succeeded, 0 files failed

Summary:
  Fetched from: lib/a
  Source: (branch: test)
  12 files succeeded
  0 files failed

=== Overall Summary ===
Projects: 2
Total files: 12
Succeeded: 12 files
Failed: 0 files
[INFO] 2025-10-09T14:13:13 Execution completed {"filesDownloaded":12,"filesFailed":0,"total":12}
```

## Installation

### Using NPX (Recommended)

No installation needed! Run directly:

```bash
npx kirox <owner>/<repo> -p <project>
```

### Global Installation

```bash
npm install -g kirox
```

## Usage

### Interactive Mode (Recommended for First-Time Users)

Run without arguments to enter interactive mode:

```bash
npx kirox
```

Interactive mode guides you through:
1. **Repository**: Enter GitHub repository (owner/repo or owner/repo#branch)
2. **Project**: Enter project name to fetch
3. **Output**: Choose output directory (default: current directory)
4. **Subdirectory**: Optional subdirectory path in repository
5. **Confirmation**: Review and confirm your choices

**Benefits:**
- ✨ No need to remember command syntax
- 🎯 Step-by-step guidance with validation
- 📝 Clear preview before execution
- 🚫 Prevent mistakes with confirmation prompt

**Note:** Interactive mode requires a TTY environment. If running in a CI/CD pipeline or non-interactive shell, use the non-interactive mode with explicit arguments.

### Non-Interactive Mode

Provide all arguments explicitly:

```bash
npx kirox yukihirop/eg-kanban -p simple-kanban-board
```

This fetches:
- `.kiro/specs/simple-kanban-board/**` - Project specifications
- `.kiro/steering/**` - Steering documents

### Branch/Tag Specification

Fetch from a specific branch or tag:

```bash
# Fetch from a feature branch
npx kirox owner/repo#feature/new-api -p project

# Fetch from a release branch
npx kirox owner/repo#release/v2.0 -p project

# Fetch from a specific tag
npx kirox owner/repo#v1.2.3 -p project

# Fetch from development branch
npx kirox owner/repo#develop -p project
```

### Subdirectory Support

Fetch from a subdirectory (useful for monorepos):

```bash
# Fetch from a subdirectory
npx kirox owner/repo --subdir packages/api -p project

# Combine with branch specification
npx kirox owner/repo#develop --subdir services/auth -p project

# Short option
npx kirox owner/repo -s apps/frontend -p project
```

### Custom Output Directory

```bash
npx kirox yukihirop/eg-kanban -p simple-kanban-board -o ./my-project
```

Files will be saved to `./my-project/.kiro/`

### Advanced Usage

```bash
# Force overwrite without confirmation
npx kirox owner/repo -p project --force

# Preview what will be fetched (no actual writes)
npx kirox owner/repo -p project --dry-run

# Verbose output for debugging
npx kirox owner/repo -p project --verbose

# Combine options
npx kirox owner/repo#develop -s packages/api -p project -o ./output --verbose --dry-run
```

## Options

| Option | Alias | Description | Default |
|--------|-------|-------------|---------|
| `--project <name>` | `-p` | Project name to fetch (required) | - |
| `--output <path>` | `-o` | Output directory | `.` (current directory) |
| `--subdir <path>` | `-s` | Subdirectory path containing .kiro folder | - |
| `--force` | - | Force overwrite without confirmation | `false` |
| `--dry-run` | - | Preview mode (no actual writes) | `false` |
| `--verbose` | - | Verbose logging | `false` |
| `--config <path>` | - | Custom config file path | - |

### Repository Format

```
owner/repo              # Fetch from default branch
owner/repo#branch       # Fetch from specific branch
owner/repo#tag          # Fetch from specific tag
```

Branch names can include slashes (e.g., `feature/new-api`, `release/v2.0`).

## Authentication

For private repositories or to avoid rate limits, set the `GITHUB_TOKEN` environment variable:

```bash
export GITHUB_TOKEN=your_github_personal_access_token
npx kirox owner/private-repo -p project
```

### Rate Limits

- **Without token**: 60 requests/hour
- **With token**: 5,000 requests/hour

## What it Fetches

Kirox fetches the following directory structures:

```
.kiro/
├── specs/
│   └── <project>/
│       ├── spec.json
│       ├── requirements.md
│       ├── design.md
│       └── tasks.md
└── steering/
    ├── product.md
    ├── tech.md
    └── structure.md
```

## Examples

### Fetch to Current Directory

```bash
npx kirox yukihirop/eg-kanban -p simple-kanban-board
# Files saved to ./.kiro/
```

### Fetch from Specific Branch

```bash
npx kirox yukihirop/eg-kanban#develop -p simple-kanban-board
# Files saved to ./.kiro/ from develop branch
```

### Fetch from Subdirectory

```bash
npx kirox owner/monorepo --subdir packages/api -p api-service
# Files saved from packages/api/.kiro/
```

### Fetch to Custom Directory

```bash
npx kirox yukihirop/eg-kanban -p simple-kanban-board -o ./tmp
# Files saved to ./tmp/.kiro/
```

### Combine Branch and Subdirectory

```bash
npx kirox owner/monorepo#feature/new-api -s services/auth -p auth-service
# Files saved from feature/new-api branch, services/auth/.kiro/
```

### Preview Before Fetching

```bash
npx kirox yukihirop/eg-kanban -p simple-kanban-board --dry-run --verbose
# Shows what would be fetched without writing files
```

## Development

### Setup

```bash
# Clone repository
git clone https://github.com/your-org/kirox.git
cd kirox

# Install dependencies
npm install

# Run in development mode
npm run dev -- owner/repo -p project
```

### Commands

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Build
npm run build

# Type check
npm run type-check
```

### Requirements

- Node.js >= 18.0.0
- TypeScript 5.x

## Configuration File

Create a `.kiroxrc.json` file in your project root to set default values:

```json
{
  "defaultRepository": "owner/repo",
  "branch": "develop",
  "subdir": "packages/api",
  "outputDirectory": "./kiro-files",
  "defaultConcurrency": 5,
  "verbose": false,
  "force": false
}
```

Command-line options override configuration file values.

## Troubleshooting

### Interactive mode not available / "TTY environment required" error

**Symptom:** Error message: "Interactive mode is only available in TTY environment. Please specify arguments explicitly."

**Cause:** Interactive mode requires a TTY (interactive terminal) environment to display prompts and receive user input.

**Solution:** Use non-interactive mode with explicit arguments:

```bash
# Instead of: npx kirox
# Use:
npx kirox owner/repo -p project-name
```

**Common scenarios where this occurs:**
- CI/CD pipelines (GitHub Actions, GitLab CI, Jenkins, etc.)
- Shell scripts with redirected input/output
- Docker containers without TTY allocation
- Cron jobs
- Non-interactive SSH sessions

**To use kirox in these environments:**
1. Always provide all required arguments explicitly
2. Use configuration file (`.kiroxrc.json`) to set defaults
3. Consider using `--force` flag to skip confirmation prompts

```bash
# Example for CI/CD
npx kirox owner/repo -p project --force --output ./kiro-files
```

### "Rate limit exceeded" error

Set `GITHUB_TOKEN` environment variable:

```bash
export GITHUB_TOKEN=your_token
```

### "Repository not found" error

- Verify repository exists: `https://github.com/owner/repo`
- For private repos, ensure `GITHUB_TOKEN` has access
- Check repository owner/name spelling

### "Branch not found" error

- Verify branch exists in repository
- Check branch name spelling (case-sensitive)
- Try fetching without branch specification to use default branch

### "Project not found" error

- Verify project exists in `.kiro/specs/<project>/`
- If using `--subdir`, verify the subdirectory path is correct
- Check project name spelling (case-sensitive)

### "Subdirectory not found" error

- Verify the subdirectory path exists in repository
- Check subdirectory path spelling
- Ensure subdirectory contains a `.kiro` folder

## License

MIT



