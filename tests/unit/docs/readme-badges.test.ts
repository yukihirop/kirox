import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('README Badge Configuration', () => {
  const readmePath = join(process.cwd(), 'README.md');
  const readmeContent = readFileSync(readmePath, 'utf-8');

  it('should have CI workflow badge', () => {
    // RED: This test will fail initially
    const ciBadgePattern = /!\[CI\]\(https:\/\/github\.com\/[^/]+\/[^/]+\/actions\/workflows\/ci\.yml\/badge\.svg\)/;
    expect(readmeContent).toMatch(ciBadgePattern);
  });

  it('should have Release workflow badge', () => {
    // RED: This test will fail initially
    const releaseBadgePattern = /!\[Release\]\(https:\/\/github\.com\/[^/]+\/[^/]+\/actions\/workflows\/release\.yml\/badge\.svg\)/;
    expect(readmeContent).toMatch(releaseBadgePattern);
  });

  it('should have CI badge linked to workflow page', () => {
    // RED: This test will fail initially
    const ciBadgeLinkPattern = /\[!\[CI\][^\]]+\]\(https:\/\/github\.com\/[^/]+\/[^/]+\/actions\/workflows\/ci\.yml\)/;
    expect(readmeContent).toMatch(ciBadgeLinkPattern);
  });

  it('should have Release badge linked to workflow page', () => {
    // RED: This test will fail initially
    const releaseBadgeLinkPattern = /\[!\[Release\][^\]]+\]\(https:\/\/github\.com\/[^/]+\/[^/]+\/actions\/workflows\/release\.yml\)/;
    expect(readmeContent).toMatch(releaseBadgeLinkPattern);
  });

  it('should have badges near the top of README', () => {
    // RED: This test will fail initially
    const lines = readmeContent.split('\n');
    const badgeLineIndex = lines.findIndex(line =>
      line.includes('![CI]') || line.includes('![Release]')
    );

    // Badges should appear within first 10 lines
    expect(badgeLineIndex).toBeGreaterThanOrEqual(0);
    expect(badgeLineIndex).toBeLessThan(10);
  });
});
