import type { KnipConfig } from 'knip';

const config: KnipConfig = {
  // Entry points (multiple targets)
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
    '.kiro/**/*',                    // Kiro specifications and steering
    '.claude/**/*',                  // Claude Code configuration
    'demo/**/*',                     // Demo files
    'docs/.vitepress/theme/**/*',    // VitePress theme (auto-loaded by VitePress)
    'node_modules/**/*',             // Dependencies (default exclusion)
  ],

  // Exclude build-only dependencies and peer dependencies
  ignoreDependencies: [
    'esbuild-plugin-tsconfig-paths', // Used internally by tsup
    'cli-width',                     // Peer dependency of @inquirer/prompts
    'mute-stream',                   // Peer dependency of @inquirer/prompts
    'yoctocolors-cjs',               // Peer dependency of @inquirer/prompts
    '@inquirer/core',                // Peer dependency of @inquirer/prompts
    '@inquirer/type',                // Peer dependency of @inquirer/prompts
    '@inquirer/ansi',                // Peer dependency of @inquirer/prompts
    '@inquirer/figures',             // Peer dependency of @inquirer/prompts
    '@types/figlet',                 // Type definitions for figlet (used in src/cli/entry.ts)
  ],

  // Enable Vitest plugin
  vitest: true,
};

export default config;
