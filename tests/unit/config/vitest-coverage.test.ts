import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('Vitest Coverage Configuration', () => {
  it('should include json-summary reporter for GitHub Actions integration', () => {
    // RED: This test will fail initially because json-summary is not yet configured
    const configPath = join(process.cwd(), 'vitest.config.ts');
    const configContent = readFileSync(configPath, 'utf-8');

    // Verify that the config includes json-summary reporter
    expect(configContent).toContain('json-summary');
  });

  it('should include json reporter for coverage data', () => {
    const configPath = join(process.cwd(), 'vitest.config.ts');
    const configContent = readFileSync(configPath, 'utf-8');

    // Verify that the config includes json reporter (already exists)
    expect(configContent).toContain('json');
  });

  it('should maintain existing text and html reporters', () => {
    const configPath = join(process.cwd(), 'vitest.config.ts');
    const configContent = readFileSync(configPath, 'utf-8');

    // Verify existing reporters are preserved
    expect(configContent).toContain('text');
    expect(configContent).toContain('html');
  });

  it('should enable reportOnFailure option', () => {
    // RED: This test will fail initially because reportOnFailure is not yet configured
    const configPath = join(process.cwd(), 'vitest.config.ts');
    const configContent = readFileSync(configPath, 'utf-8');

    // Verify that reportOnFailure is set to true
    expect(configContent).toContain('reportOnFailure');
    expect(configContent).toMatch(/reportOnFailure:\s*true/);
  });
});
