# Kirox

CLI tool to fetch Kiro specification and steering files from remote GitHub repositories.

## Features

- 📦 Fetch Kiro specification and steering files from any GitHub repository
- 🚀 NPX support - no installation required
- 🔄 Automatic directory creation
- ✅ Overwrite confirmation prompts
- 🎨 Colorized output and progress indicators
- 🔍 Verbose logging for debugging
- 🏃 Dry-run mode to preview operations

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

### Basic Usage

```bash
npx kirox yukihirop/eg-kanban -p simple-kanban-board
```

This fetches:
- `.kiro/specs/simple-kanban-board/**` - Project specifications
- `.kiro/steering/**` - Steering documents

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
npx kirox owner/repo -p project -o ./output --verbose --dry-run
```

## Options

| Option | Alias | Description | Default |
|--------|-------|-------------|---------|
| `--project <name>` | `-p` | Project name to fetch (required) | - |
| `--output <path>` | `-o` | Output directory | `.` (current directory) |
| `--force` | - | Force overwrite without confirmation | `false` |
| `--dry-run` | - | Preview mode (no actual writes) | `false` |
| `--verbose` | - | Verbose logging | `false` |
| `--config <path>` | - | Custom config file path | - |

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

### Fetch to Custom Directory

```bash
npx kirox yukihirop/eg-kanban -p simple-kanban-board -o ./tmp
# Files saved to ./tmp/.kiro/
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

## Troubleshooting

### "Rate limit exceeded" error

Set `GITHUB_TOKEN` environment variable:

```bash
export GITHUB_TOKEN=your_token
```

### "Repository not found" error

- Verify repository exists: `https://github.com/owner/repo`
- For private repos, ensure `GITHUB_TOKEN` has access
- Check repository owner/name spelling

### "Project not found" error

- Verify project exists in `.kiro/specs/<project>/`
- Check project name spelling (case-sensitive)

## License

MIT



