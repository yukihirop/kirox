/**
 * Searchable Subdirectory Prompt Service
 *
 * Re-exports promptSubdirSelection from prompts/ directory for backward compatibility
 *
 * @deprecated Use 'src/cli/prompts/subdir-selection-prompt.ts' directly instead
 */

export {
  promptSubdirSelection,
  type SubdirSelectionResult,
} from './prompts/subdir-selection-prompt.js';
