import path from 'path';

export function normalizeSubdirPath(subdirPath: string): string {
  if (!subdirPath || typeof subdirPath !== 'string') {
    return '';
  }

  let normalized = subdirPath.trim();

  normalized = normalized.replace(/\\/g, '/');

  normalized = normalized.replace(/^\/+/, '').replace(/^\.\//, '');

  normalized = normalized.replace(/\/+/g, '/');

  normalized = normalized.replace(/\/+$/, '');

  if (normalized === '.' || normalized === '') {
    return '';
  }

  return normalized;
}

export function validateSubdirPath(subdirPath: string): void {
  if (subdirPath === '') {
    return;
  }

  if (subdirPath.includes('..')) {
    throw new Error(
      `サブディレクトリパスにパストラバーサル (..) は使用できません: ${subdirPath}`
    );
  }

  if (path.isAbsolute(subdirPath)) {
    throw new Error(
      `サブディレクトリパスに絶対パスは使用できません: ${subdirPath}`
    );
  }

  if (/^[a-zA-Z]:[\\/]/.test(subdirPath)) {
    throw new Error(
      `サブディレクトリパスに絶対パスは使用できません: ${subdirPath}`
    );
  }
}

export function buildRemotePath(
  subdir: string,
  projectName: string,
  type: 'specs' | 'steering'
): string {
  const kiroBase = subdir ? `${subdir}/.kiro` : '.kiro';

  if (type === 'specs') {
    if (!isValidProjectName(projectName)) {
      throw new Error(`Invalid project name: "${projectName}"`);
    }
    return `${kiroBase}/specs/${projectName}`;
  } else {
    return `${kiroBase}/steering`;
  }
}

export function isValidProjectName(projectName: string): boolean {
  if (!projectName || typeof projectName !== 'string') {
    return false;
  }

  const trimmed = projectName.trim();

  if (trimmed.length === 0) {
    return false;
  }

  if (trimmed.includes('..')) {
    return false;
  }

  if (trimmed.includes('/') || trimmed.includes('\\')) {
    return false;
  }

  return true;
}

export function getSpecDirectoryPath(projectName: string): string {
  return buildRemotePath('', projectName, 'specs');
}

export function getSteeringDirectoryPath(): string {
  return buildRemotePath('', '', 'steering');
}

export function convertRemoteToLocalPath(remotePath: string): string {
  if (!remotePath || typeof remotePath !== 'string') {
    throw new Error('Remote path must be a non-empty string');
  }

  const normalized = path.normalize(remotePath).replace(/\\/g, '/');

  if (normalized.includes('..')) {
    throw new Error('Invalid path: contains path traversal');
  }

  if (!normalized.includes('.kiro/')) {
    throw new Error('Path must be within .kiro directory');
  }

  const cleaned = normalized.replace(/\/+/g, '/');

  return cleaned;
}

export function resolveOutputPath(
  outputDir: string,
  remotePath: string
): string {
  if (!outputDir || typeof outputDir !== 'string') {
    throw new Error('Output directory must be a non-empty string');
  }

  const normalizedRemotePath = convertRemoteToLocalPath(remotePath);

  const kiroIndex = normalizedRemotePath.indexOf('.kiro/');
  if (kiroIndex === -1) {
    throw new Error('Path must contain .kiro/ directory');
  }

  const pathWithoutSubdir = normalizedRemotePath.substring(kiroIndex);

  const absoluteOutputDir = path.resolve(outputDir);

  const fullPath = path.join(absoluteOutputDir, pathWithoutSubdir);

  return path.normalize(fullPath);
}
