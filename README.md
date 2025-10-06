## Kirox

CLI tool to fetch Kiro specification and steering files from remote GitHub repositories.

### Usage

```bash
npx kirox <github_user>/<repo_name> -p <project>
```

### Options

- `-p, --project <name>`: Project name to fetch (required)
- `--force`: Force overwrite without confirmation
- `--dry-run`: Dry-run mode (no actual writes)
- `--verbose`: Verbose logging
- `--config <path>`: Custom config file path

### What it fetches

- `.kiro/specs/<project>/**` - Project specifications
- `.kiro/steering/**` - Steering documents

### Development

```bash
# Install dependencies
npm install

# Run tests
npm test

# Build
npm run build

# Type check
npm run type-check
```



