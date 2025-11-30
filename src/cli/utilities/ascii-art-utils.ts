import figlet from 'figlet';

export function generateKiroxAsciiArt(): string {
  try {
    const result = figlet.textSync('kirox', {
      font: 'ANSI Shadow',
      horizontalLayout: 'default',
      verticalLayout: 'default',
    });

    if (!result || result.trim() === '') {
      return 'kirox\n';
    }

    return result;
  } catch (_error) {
    return 'kirox\n';
  }
}
