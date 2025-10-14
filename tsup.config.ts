import { defineConfig } from 'tsup';
// Removed tsconfig-paths plugin because it attempted to transform node_modules and crashed

export default defineConfig({
  entry: ['src/index.ts'],
  outDir: 'dist',
  format: ['cjs'],
  platform: 'node',
  target: 'node18',
  sourcemap: false,
  clean: true,
  minify: true,
  splitting: false,
  // Bundle dependencies from node_modules so that octokit and its plugins are included
  skipNodeModulesBundle: false,
  dts: false,
  outExtension: ({ format }) => ({ js: format === 'cjs' ? '.cjs' : '.js' }),
  // No custom esbuild plugins; avoid transforming node_modules
  external: [],
  // Resolve TS path aliases via manual mapping if needed in the future.
  // esbuild does not honor tsconfig paths automatically; current source uses
  // '@/...' imports which are only within the project and will be bundled.
});


