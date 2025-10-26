# Contributing to Kirox

Thank you for your interest in contributing to Kirox! This guide will help you get started with code development, documentation, and code quality management.

---

## Table of Contents

- [Code Development](#code-development)
  - [Quick Start](#quick-start-development)
  - [Code Quality](#code-quality)
  - [Running Tests](#running-tests)
- [Documentation](#documentation)
  - [Quick Start](#quick-start-documentation)
  - [Documentation Structure](#documentation-structure)

---

# Code Development

## Quick Start (Development)

### Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0

### Setup Development Environment

```bash
# Clone the repository
git clone https://github.com/yukihirop/kirox.git
cd kirox

# Install dependencies
npm install

# Build the project
npm run build

# Run tests
npm test
```

### Development Commands

```bash
# Development mode (run CLI without building)
npm run dev

# Build for production
npm run build

# Type checking
npm run type-check

# Linting
npm run lint              # ESLint only
npm run lint:knip         # Knip only
npm run lint:all          # Both ESLint and Knip

# Testing
npm test                  # Run tests
npm run test:watch        # Watch mode
npm run test:coverage     # With coverage report

# Formatting
npm run format
```

## Code Quality

Kirox uses multiple tools to ensure code quality and maintainability:

- **TypeScript** - Static type checking
- **ESLint** - Code linting and style enforcement
- **Knip** - Unused code detection (files, dependencies, exports)
- **Vitest** - Unit and integration testing
- **Prettier** - Code formatting

### Knip - Unused Code Detection

Knip helps maintain a clean codebase by detecting:
- **Unused files** - Source files not imported anywhere
- **Unused dependencies** - npm packages not used in the code
- **Unused exports** - Functions, types, and variables exported but never imported

#### Running Knip Locally

```bash
# Run knip check
npm run knip
# or
npm run lint:knip

# Run all linting (ESLint + Knip)
npm run lint:all
```

#### Understanding Knip Reports

Knip output includes several categories:

1. **Unused files**
   ```
   Unused files (1)
   src/utils/old-helper.ts
   ```
   **Action**: Remove the file or add it to entry points if needed

2. **Unused dependencies**
   ```
   Unused dependencies (1)
   lodash  package.json
   ```
   **Action**: Remove from package.json or use it in code

3. **Unused exports**
   ```
   Unused exports (1)
   helperFunction  function  src/utils/helpers.ts:45:23
   ```
   **Action**: Remove export or use it elsewhere

4. **Configuration hints**
   ```
   Configuration hints (2)
   src/index.ts      knip.ts       Remove redundant entry pattern
   .dist/index.js    package.json  Package entry file not found
   ```
   **Action**: Review configuration or build the project first

#### Knip Configuration

Knip configuration is defined in `knip.ts`:

```typescript
const config: KnipConfig = {
  // Entry points - starting points for dependency analysis
  entry: [
    'src/index.ts',                  // CLI entry point
    'docs/.vitepress/config.ts',     // VitePress documentation
  ],

  // Files to analyze
  project: [
    'src/**/*.ts',                   // Source code
    'tests/**/*.test.ts',            // Test files
    'docs/.vitepress/**/*.ts',       // VitePress configuration
  ],

  // Exclusion patterns
  ignore: [
    'dist/**/*',                     // Build artifacts
    '.kiro/**/*',                    // Kiro specifications
    '.claude/**/*',                  // Claude Code config
    'demo/**/*',                     // Demo files
  ],

  // Exclude known build-only and peer dependencies
  ignoreDependencies: [
    'esbuild-plugin-tsconfig-paths', // Used by tsup internally
    // @inquirer/prompts peer dependencies
    'cli-width',
    'mute-stream',
    'yoctocolors-cjs',
  ],

  // Enable Vitest plugin for test file analysis
  vitest: true,
};
```

#### Handling Knip Issues

**False Positives**: If Knip reports a false positive:
- Add the pattern to `ignore` in `knip.ts`
- Add the dependency to `ignoreDependencies`
- Use `ignoreExportsUsedInFile: true` for public APIs

**Legitimate Issues**: If Knip finds real unused code:
- Remove unused files, dependencies, or exports
- Or document why they're kept (future use, public API)

#### CI/CD Integration

Knip runs automatically in GitHub Actions CI/CD pipeline:

1. **When**: On every pull request and push to main
2. **Where**: After type checking and linting, before tests
3. **What happens**: If unused code is detected, CI provides a report (but may not fail the build)

See `.github/workflows/ci.yml` for the complete workflow.

## Running Tests

```bash
# Run all tests
npm test

# Watch mode for development
npm run test:watch

# Generate coverage report
npm run test:coverage
```

### Test Structure

```
tests/
├── unit/           # Unit tests for individual functions
└── integration/    # Integration tests for components
```

### Writing Tests

- Use Vitest for all tests
- Follow the Arrange-Act-Assert pattern
- Mock external dependencies (GitHub API, filesystem)
- Aim for high test coverage on core logic

Example test:

```typescript
import { describe, it, expect } from 'vitest';
import { parseRepository } from '@/github/parser';

describe('parseRepository', () => {
  it('should parse owner/repo format', () => {
    const result = parseRepository('owner/repo');

    expect(result.owner).toBe('owner');
    expect(result.repo).toBe('repo');
  });
});
```

---

# Documentation

## Documentation Structure

Kirox documentation is built with [VitePress](https://vitepress.dev/) and organized into the following sections:

```
docs/
├── index.md                # Home page
├── guide/                  # User guides
│   ├── index.md
│   ├── getting-started.md
│   ├── basic-usage.md
│   ├── advanced-usage.md
│   └── troubleshooting.md
├── cli/                    # CLI reference
│   ├── index.md
│   ├── kirox.md
│   ├── add.md
│   └── completion.md
├── api/                    # API documentation
│   ├── index.md
│   ├── github-fetcher.md
│   └── filesystem-writer.md
├── config/                 # Configuration reference
│   ├── index.md
│   └── kiroxrc.md
├── public/                 # Static assets (images, robots.txt)
└── .vitepress/             # VitePress configuration
    ├── config.ts           # Site configuration
    └── theme/              # Custom theme
```

## Quick Start (Documentation)

### Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0

### Setup Development Environment

```bash
# Clone the repository
git clone https://github.com/yukihirop/kirox.git
cd kirox

# Install dependencies
npm install

# Start documentation dev server
npm run docs:dev
```

The documentation will be available at `http://localhost:5173/kirox/` (or another port if 5173 is in use).

## Making Changes

### Editing Existing Pages

1. **Locate the file** you want to edit in the `docs/` directory
2. **Edit the markdown** file using your preferred editor
3. **Preview changes** - The dev server automatically reloads
4. **Commit your changes** with a descriptive message

Example:
```bash
# Edit a guide
vim docs/guide/getting-started.md

# Preview at http://localhost:5173/kirox/guide/getting-started
# Changes are hot-reloaded automatically
```

### Adding New Pages

To add a new documentation page:

1. **Create a new markdown file** in the appropriate section directory

Example: Adding a new guide page

```bash
# Create new file
touch docs/guide/new-feature.md
```

2. **Add frontmatter** at the top of the file

```markdown
---
title: New Feature Guide
description: Learn how to use the new feature
---

# New Feature Guide

Content goes here...
```

3. **Update navigation** in `docs/.vitepress/config.ts`

```typescript
sidebar: {
  '/guide/': [
    {
      text: 'ガイド',
      items: [
        { text: '概要', link: '/guide/' },
        { text: 'はじめに', link: '/guide/getting-started' },
        { text: 'New Feature', link: '/guide/new-feature' }, // Add this line
        // ... other items
      ]
    }
  ]
}
```

4. **Preview the new page** at `http://localhost:5173/kirox/guide/new-feature`

### Markdown Features

VitePress supports GitHub Flavored Markdown plus additional features:

#### Custom Containers

```markdown
::: tip ヒント
This is a tip container
:::

::: warning 注意
This is a warning container
:::

::: danger 危険
This is a danger container
:::
```

#### Code Blocks with Line Numbers

```markdown
\`\`\`typescript
function hello(name: string): string {
  return `Hello, ${name}!`;
}
\`\`\`
```

#### Internal Links

```markdown
[Getting Started](/guide/getting-started)
[CLI Reference](/cli/kirox)
```

#### Line Highlighting in Code Blocks

```markdown
\`\`\`typescript{2,4-6}
function example() {
  const a = 1;  // highlighted
  const b = 2;
  const c = 3;  // highlighted
  const d = 4;  // highlighted
  const e = 5;  // highlighted
}
\`\`\`
```

## Building and Testing

### Build Documentation

```bash
# Build for production
npm run docs:build

# Output is in docs/.vitepress/dist/
```

### Preview Production Build

```bash
# Preview built documentation
npm run docs:preview
```

### Type Checking

```bash
# Run TypeScript type check (includes VitePress config)
npm run type-check
```

## Updating Navigation

When adding or removing pages, update the navigation in `docs/.vitepress/config.ts`:

### Top Navigation (Nav Bar)

```typescript
nav: [
  { text: 'ガイド', link: '/guide/' },
  { text: 'CLI リファレンス', link: '/cli/' },
  { text: 'API 仕様', link: '/api/' },
  { text: '設定', link: '/config/' }
]
```

### Sidebar Navigation

Each section has its own sidebar configuration:

```typescript
sidebar: {
  '/guide/': [
    {
      text: 'ガイド',
      items: [
        { text: '概要', link: '/guide/' },
        { text: 'はじめに', link: '/guide/getting-started' },
        // Add new pages here
      ]
    }
  ],
  // ... other sections
}
```

## Style Guide

### Page Structure

Each documentation page should follow this structure:

1. **Frontmatter** - Title and description
2. **Main Heading** - Page title (H1)
3. **Introduction** - Brief overview
4. **Sections** - Organized with H2 and H3 headings
5. **Examples** - Code examples and use cases
6. **Related Links** - Links to related documentation

Example:

```markdown
---
title: Feature Name
description: Brief description of the feature
---

# Feature Name

Brief introduction explaining what this feature does.

## Basic Usage

How to use the feature...

### Example 1

Code example...

### Example 2

Another example...

## Advanced Usage

Advanced features...

## Related Pages

- [Getting Started](/guide/getting-started)
- [CLI Reference](/cli/kirox)
```

### Writing Style

- Use clear, concise language
- Provide code examples for concepts
- Use headings to organize content
- Include warnings for important notes
- Add tips for helpful information
- Link to related documentation

### Code Examples

- Include complete, runnable examples
- Add comments to explain complex code
- Show both input and expected output
- Use realistic examples

## Deployment

Documentation is automatically deployed to GitHub Pages when changes are merged to the `main` branch.

### Deployment Process

1. **Push to main** - Merge your pull request to `main` branch
2. **GitHub Actions** - Workflow automatically builds documentation
3. **Deploy to Pages** - Built site is deployed to GitHub Pages
4. **Live URL** - Available at https://yukihirop.github.io/kirox/

### Deployment Workflow

The deployment is configured in `.github/workflows/deploy-docs.yml`:

- **Trigger**: Push to `main` branch or manual workflow dispatch
- **Build**: VitePress builds static site
- **Deploy**: GitHub Pages deployment action

## Pull Request Guidelines

When submitting documentation changes:

1. **Create a feature branch**
   ```bash
   git checkout -b docs/your-feature-name
   ```

2. **Make your changes** and test locally

3. **Commit with clear messages**
   ```bash
   git commit -m "docs: add guide for new feature"
   ```

4. **Push and create PR**
   ```bash
   git push origin docs/your-feature-name
   ```

5. **PR Description** should include:
   - What documentation was added/changed
   - Why the change was needed
   - Link to any related issues

## Common Tasks

### Adding a New Guide

```bash
# 1. Create new guide file
touch docs/guide/my-new-guide.md

# 2. Add frontmatter and content
cat > docs/guide/my-new-guide.md << 'EOF'
---
title: My New Guide
description: Description of the guide
---

# My New Guide

Content here...
EOF

# 3. Update navigation in docs/.vitepress/config.ts
# Add { text: 'My New Guide', link: '/guide/my-new-guide' }

# 4. Test locally
npm run docs:dev
```

### Adding a New CLI Command

```bash
# 1. Create CLI reference file
touch docs/cli/new-command.md

# 2. Add frontmatter and content
cat > docs/cli/new-command.md << 'EOF'
---
title: new-command
description: Description of new-command
---

# new-command

Usage examples and reference...
EOF

# 3. Update sidebar in docs/.vitepress/config.ts
# Add { text: 'new-command', link: '/cli/new-command' }

# 4. Test locally
npm run docs:dev
```

### Updating Theme or Styling

Custom theme files are in `docs/.vitepress/theme/`:

- `index.ts` - Theme entry point
- `custom.css` - Custom CSS variables and styles

To modify colors or styling, edit `custom.css`:

```css
:root {
  --vp-c-brand-1: #3eaf7c;  /* Primary brand color */
  --vp-c-brand-2: #42b883;  /* Secondary brand color */
}
```

## Troubleshooting

### Port Already in Use

If port 5173 is already in use:

```bash
# VitePress will automatically try another port
# Check console output for the actual port
npm run docs:dev
# Output: Local: http://localhost:5174/kirox/
```

### Build Errors

If you encounter build errors:

```bash
# Clean and rebuild
rm -rf docs/.vitepress/dist docs/.vitepress/.temp
npm run docs:build
```

### Type Check Failures

If TypeScript type checking fails:

```bash
# Check VitePress config
npm run type-check

# Fix any TypeScript errors in docs/.vitepress/config.ts
```

## Getting Help

- **Documentation**: https://yukihirop.github.io/kirox/
- **VitePress Docs**: https://vitepress.dev/
- **Issues**: https://github.com/yukihirop/kirox/issues
- **Discussions**: https://github.com/yukihirop/kirox/discussions

## License

By contributing to Kirox documentation, you agree that your contributions will be licensed under the MIT License.
