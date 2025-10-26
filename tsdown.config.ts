import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['src/index.ts'],
  outDir: 'dist',
  format: ['es'],
  external: [
    // Node.js built-in modules
    'fs',
    'path',
    'os',
    'crypto',
    'readline',
    'node:fs',
    'node:path',
    'node:os',
    'node:crypto',
    'node:readline',
    'node:process',
    'node:async_hooks',
    'node:util',
    // Path aliases - treat as external
    '@/cli/validator',
    '@/filesystem/path-utils',
    '@/github/fetcher',
    '@/cli/project-name-parser',
    // Third-party dependencies
    'octokit',
    'commander',
    'chalk',
    'figlet',
    '@inquirer/prompts',
    'yoctocolors-cjs',
    'mute-stream',
    'cli-width'
  ],
  clean: true
});
