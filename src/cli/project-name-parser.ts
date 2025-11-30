export function parseProjects(input: string): string[] {
  const trimmedInput = input.trim();

  if (trimmedInput === '') {
    return [];
  }

  return trimmedInput
    .split(',')
    .map(project => project.trim())
    .filter(project => project !== '');
}
