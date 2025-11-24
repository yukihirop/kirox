import { describe, it, expect } from 'vitest';
import { getMetadataPath, isDuplicateProject } from '@/cli/metadata-utils.js';
import type { Metadata } from '@/tracking/types.js';

describe('MetadataUtils', () => {
  describe('getMetadataPath', () => {
    it('should generate metadata file path from output directory', () => {
      const outputDir = '/path/to/output';
      const result = getMetadataPath(outputDir);

      expect(result).toBe('/path/to/output/.kiro/.kirox-meta.json');
    });

    it('should handle output directory with trailing slash', () => {
      const outputDir = '/path/to/output/';
      const result = getMetadataPath(outputDir);

      expect(result).toBe('/path/to/output/.kiro/.kirox-meta.json');
    });

    it('should handle current directory', () => {
      const outputDir = '.';
      const result = getMetadataPath(outputDir);

      expect(result).toBe('.kiro/.kirox-meta.json');
    });

    it('should return explicit string type', () => {
      const result = getMetadataPath('/test');
      expect(typeof result).toBe('string');
    });
  });

  describe('isDuplicateProject', () => {
    const createMetadata = (): Metadata => ({
      version: '1.0.0',
      projects: [
        {
          repository: 'owner/repo1',
          projectName: 'project-a',
          subdir: 'apps/frontend',
          branch: 'main',
          lastUpdated: '2024-01-01T00:00:00.000Z',
          files: [],
        },
        {
          repository: 'owner/repo1',
          projectName: 'project-b',
          subdir: 'apps/backend',
          branch: 'main',
          lastUpdated: '2024-01-01T00:00:00.000Z',
          files: [],
        },
        {
          repository: 'owner/repo2',
          projectName: 'project-a',
          subdir: undefined,
          branch: 'develop',
          lastUpdated: '2024-01-01T00:00:00.000Z',
          files: [],
        },
      ],
    });

    it('should detect duplicate with exact match (repository + projectName + subdir)', () => {
      const metadata = createMetadata();
      const result = isDuplicateProject(metadata, 'owner/repo1', 'project-a', 'apps/frontend');

      expect(result).toBe(true);
    });

    it('should not detect duplicate when repository differs', () => {
      const metadata = createMetadata();
      const result = isDuplicateProject(metadata, 'owner/repo-different', 'project-a', 'apps/frontend');

      expect(result).toBe(false);
    });

    it('should not detect duplicate when projectName differs', () => {
      const metadata = createMetadata();
      const result = isDuplicateProject(metadata, 'owner/repo1', 'project-c', 'apps/frontend');

      expect(result).toBe(false);
    });

    it('should not detect duplicate when subdir differs', () => {
      const metadata = createMetadata();
      const result = isDuplicateProject(metadata, 'owner/repo1', 'project-a', 'apps/mobile');

      expect(result).toBe(false);
    });

    it('should detect duplicate when subdir is undefined (root project)', () => {
      const metadata = createMetadata();
      const result = isDuplicateProject(metadata, 'owner/repo2', 'project-a', undefined);

      expect(result).toBe(true);
    });

    it('should not detect duplicate when checking root vs subdirectory project', () => {
      const metadata = createMetadata();
      const result = isDuplicateProject(metadata, 'owner/repo2', 'project-a', 'some/subdir');

      expect(result).toBe(false);
    });

    it('should return false for empty metadata', () => {
      const emptyMetadata: Metadata = {
        version: '1.0.0',
        projects: [],
      };
      const result = isDuplicateProject(emptyMetadata, 'owner/repo', 'project-a', 'subdir');

      expect(result).toBe(false);
    });

    it('should return explicit boolean type', () => {
      const metadata = createMetadata();
      const result = isDuplicateProject(metadata, 'owner/repo1', 'project-a', 'apps/frontend');
      expect(typeof result).toBe('boolean');
    });
  });
});
