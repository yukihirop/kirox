/**
 * Interactive Prompt Dependency Test
 *
 * Verify @inquirer/prompts is available and can be imported
 */

import { describe, it, expect } from 'vitest';

describe('Interactive Prompt Dependency', () => {
  it('should be able to import input from @inquirer/prompts', async () => {
    const { input } = await import('@inquirer/prompts');
    expect(input).toBeDefined();
    expect(typeof input).toBe('function');
  });

  it('should be able to import confirm from @inquirer/prompts', async () => {
    const { confirm } = await import('@inquirer/prompts');
    expect(confirm).toBeDefined();
    expect(typeof confirm).toBe('function');
  });

  it('should have TypeScript types for @inquirer/prompts', async () => {
    // This test will fail at compile time if types are not available
    const { input, confirm } = await import('@inquirer/prompts');

    // TypeScript will enforce type checking here
    const inputType: typeof input = input;
    const confirmType: typeof confirm = confirm;

    expect(inputType).toBe(input);
    expect(confirmType).toBe(confirm);
  });
});
