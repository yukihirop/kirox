import { promises as fs } from 'fs';
import path from 'path';
import {
  Metadata,
  MetadataError,
  MetadataErrorType,
  ProjectMetadata,
  FileMetadata,
} from './types.js';

const METADATA_PATH = path.join(process.cwd(), '.kiro', '.kirox-meta.json');

function validateMetadataSchema(data: unknown): data is Metadata {
  if (typeof data !== 'object' || data === null) {
    throw new MetadataError(
      MetadataErrorType.INVALID_SCHEMA,
      'Metadata must be an object',
      'Root value must be a JSON object'
    );
  }

  const metadata = data as Record<string, unknown>;

  if (!('version' in metadata) || typeof metadata.version !== 'string') {
    throw new MetadataError(
      MetadataErrorType.INVALID_SCHEMA,
      'Missing or invalid "version" field',
      'Field "version" must be a string'
    );
  }

  if (!('projects' in metadata)) {
    throw new MetadataError(
      MetadataErrorType.INVALID_SCHEMA,
      'Missing "projects" field',
      'Field "projects" is required'
    );
  }

  if (!Array.isArray(metadata.projects)) {
    throw new MetadataError(
      MetadataErrorType.INVALID_SCHEMA,
      'Invalid "projects" field',
      'Field "projects" must be an array'
    );
  }

  for (let i = 0; i < metadata.projects.length; i++) {
    const project = metadata.projects[i];

    if (typeof project !== 'object' || project === null) {
      throw new MetadataError(
        MetadataErrorType.INVALID_SCHEMA,
        `Invalid project at index ${i}`,
        'Each project must be an object'
      );
    }

    const proj = project as Record<string, unknown>;

    const requiredProjectFields = ['repository', 'projectName', 'fetchedAt', 'files'];
    for (const field of requiredProjectFields) {
      if (!(field in proj)) {
        throw new MetadataError(
          MetadataErrorType.INVALID_SCHEMA,
          `Missing "${field}" field in project at index ${i}`,
          `Field "${field}" is required for each project`
        );
      }
    }

    if (typeof proj.repository !== 'string') {
      throw new MetadataError(
        MetadataErrorType.INVALID_SCHEMA,
        `Invalid "repository" field in project at index ${i}`,
        'Field "repository" must be a string'
      );
    }

    if (typeof proj.projectName !== 'string') {
      throw new MetadataError(
        MetadataErrorType.INVALID_SCHEMA,
        `Invalid "projectName" field in project at index ${i}`,
        'Field "projectName" must be a string'
      );
    }

    if (typeof proj.fetchedAt !== 'string') {
      throw new MetadataError(
        MetadataErrorType.INVALID_SCHEMA,
        `Invalid "fetchedAt" field in project at index ${i}`,
        'Field "fetchedAt" must be a string'
      );
    }

    if (!Array.isArray(proj.files)) {
      throw new MetadataError(
        MetadataErrorType.INVALID_SCHEMA,
        `Invalid "files" field in project at index ${i}`,
        'Field "files" must be an array'
      );
    }

    for (let j = 0; j < proj.files.length; j++) {
      const file = proj.files[j];

      if (typeof file !== 'object' || file === null) {
        throw new MetadataError(
          MetadataErrorType.INVALID_SCHEMA,
          `Invalid file at project ${i}, file ${j}`,
          'Each file must be an object'
        );
      }

      const f = file as Record<string, unknown>;

      const requiredFileFields = ['path', 'sha', 'localHash', 'size', 'fetchedAt'];
      for (const field of requiredFileFields) {
        if (!(field in f)) {
          throw new MetadataError(
            MetadataErrorType.INVALID_SCHEMA,
            `Missing "${field}" field in file at project ${i}, file ${j}`,
            `Field "${field}" is required for each file`
          );
        }
      }

      if (typeof f.path !== 'string') {
        throw new MetadataError(
          MetadataErrorType.INVALID_SCHEMA,
          `Invalid "path" field in file at project ${i}, file ${j}`,
          'Field "path" must be a string'
        );
      }

      if (typeof f.sha !== 'string') {
        throw new MetadataError(
          MetadataErrorType.INVALID_SCHEMA,
          `Invalid "sha" field in file at project ${i}, file ${j}`,
          'Field "sha" must be a string'
        );
      }

      if (typeof f.localHash !== 'string') {
        throw new MetadataError(
          MetadataErrorType.INVALID_SCHEMA,
          `Invalid "localHash" field in file at project ${i}, file ${j}`,
          'Field "localHash" must be a string'
        );
      }

      if (typeof f.size !== 'number') {
        throw new MetadataError(
          MetadataErrorType.INVALID_SCHEMA,
          `Invalid "size" field in file at project ${i}, file ${j}`,
          'Field "size" must be a number'
        );
      }

      if (typeof f.fetchedAt !== 'string') {
        throw new MetadataError(
          MetadataErrorType.INVALID_SCHEMA,
          `Invalid "fetchedAt" field in file at project ${i}, file ${j}`,
          'Field "fetchedAt" must be a string'
        );
      }
    }
  }

  return true;
}

export async function loadMetadata(
  metadataPath: string = METADATA_PATH
): Promise<Metadata> {
  try {
    await fs.access(metadataPath);
  } catch (_error) {
    throw new MetadataError(
      MetadataErrorType.NOT_FOUND,
      'Metadata file not found',
      `File does not exist: ${metadataPath}`
    );
  }

  let fileContent: string;
  try {
    fileContent = await fs.readFile(metadataPath, 'utf-8');
  } catch (error) {
    throw new MetadataError(
      MetadataErrorType.READ_FAILED,
      'Failed to read metadata file',
      error instanceof Error ? error.message : String(error)
    );
  }

  let parsedData: unknown;
  try {
    parsedData = JSON.parse(fileContent);
  } catch (error) {
    throw new MetadataError(
      MetadataErrorType.INVALID_FORMAT,
      'Invalid JSON format',
      error instanceof Error ? error.message : String(error)
    );
  }

  validateMetadataSchema(parsedData);

  return parsedData as Metadata;
}

export async function saveMetadata(
  metadata: Metadata,
  metadataPath: string = METADATA_PATH
): Promise<void> {
  const tempPath = `${metadataPath}.tmp`;

  try {
    const jsonContent = JSON.stringify(metadata, null, 2);

    await fs.writeFile(tempPath, jsonContent, { encoding: 'utf-8', mode: 0o644 });

    await fs.rename(tempPath, metadataPath);
  } catch (error) {
    try {
      await fs.unlink(tempPath);
    } catch {
    }

    throw new MetadataError(
      MetadataErrorType.WRITE_FAILED,
      'Failed to write metadata file',
      error instanceof Error ? error.message : String(error)
    );
  }
}

export async function upsertProject(
  project: ProjectMetadata,
  metadataPath: string = METADATA_PATH
): Promise<void> {
  let metadata: Metadata;
  try {
    metadata = await loadMetadata(metadataPath);
  } catch (error) {
    if (error instanceof MetadataError && error.type === MetadataErrorType.NOT_FOUND) {
      metadata = {
        version: '1.0',
        projects: [],
      };
    } else {
      throw error;
    }
  }

  const existingIndex = metadata.projects.findIndex(
    (p) => p.repository === project.repository && p.projectName === project.projectName
  );

  if (existingIndex >= 0) {
    metadata.projects[existingIndex] = project;
  } else {
    metadata.projects.push(project);
  }

  await saveMetadata(metadata, metadataPath);
}

export async function upsertFile(
  repository: string,
  projectName: string,
  file: FileMetadata,
  metadataPath: string = METADATA_PATH
): Promise<void> {
  const metadata = await loadMetadata(metadataPath);

  const project = metadata.projects.find(
    (p) => p.repository === repository && p.projectName === projectName
  );

  if (!project) {
    throw new MetadataError(
      MetadataErrorType.NOT_FOUND,
      `Project not found: ${repository}/${projectName}`,
      `No project found with repository "${repository}" and name "${projectName}"`
    );
  }

  const existingIndex = project.files.findIndex((f) => f.path === file.path);

  if (existingIndex >= 0) {
    project.files[existingIndex] = file;
  } else {
    project.files.push(file);
  }

  await saveMetadata(metadata, metadataPath);
}
