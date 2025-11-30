import path from 'path';
import type { Metadata } from '../tracking/types.js';

export function getMetadataPath(outputDir: string): string {
  return path.join(outputDir, '.kiro', '.kirox-meta.json');
}

export function isDuplicateProject(
  metadata: Metadata,
  repository: string,
  projectName: string,
  subdir?: string
): boolean {
  return metadata.projects.some(
    (project) =>
      project.repository === repository &&
      project.projectName === projectName &&
      project.subdir === subdir
  );
}
