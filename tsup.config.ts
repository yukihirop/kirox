import { defineConfig } from 'tsup';
import { tsconfigPathsPlugin } from 'esbuild-plugin-tsconfig-paths';

export default defineConfig({
  entry: ['src/index.ts'],
  outDir: 'dist',
  format: ['esm'],
  platform: 'node',
  target: 'node18',
  sourcemap: false,
  clean: true,
  minify: true,
  splitting: false,
  skipNodeModulesBundle: true,
  dts: false,
  // Keep external runtime deps unbundled (safer for CLI + ESM resolution)
  external: [
    'octokit',
    'commander',
    'chalk',
    'figlet',
    '@inquirer/prompts',
  ],
  esbuildPlugins: [tsconfigPathsPlugin({ filter: /\.[tj]sx?$/ })],
  // Resolve TS path aliases via manual mapping if needed in the future.
  // esbuild does not honor tsconfig paths automatically; current source uses
  // '@/...' imports which are only within the project and will be bundled.
});


