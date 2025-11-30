/**
 * Unit tests for ASCII Art Utilities
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import figlet from 'figlet';

// Mock figlet module
vi.mock('figlet');

describe('ASCII Art Utils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('generateKiroxAsciiArt', () => {
    it('should generate ASCII art using figlet with correct configuration', async () => {
      const mockAsciiArt = `
  _    _
 | | _(_)_ __ _____  __
 | |/ / | '__/ _ \\ \\/ /
 |   <| | | | (_) >  <
 |_|\\_\\_|_|  \\___/_/\\_\\
`;

      (figlet.textSync as ReturnType<typeof vi.fn>).mockReturnValue(mockAsciiArt);

      const { generateKiroxAsciiArt } = await import('../../../../src/cli/utilities/ascii-art-utils.js');
      const result = generateKiroxAsciiArt();

      expect(result).toBe(mockAsciiArt);
      expect(figlet.textSync).toHaveBeenCalledWith('kirox', {
        font: 'ANSI Shadow',
        horizontalLayout: 'default',
        verticalLayout: 'default',
      });
      expect(figlet.textSync).toHaveBeenCalledTimes(1);
    });

    it('should return fallback text when figlet throws an error', async () => {
      (figlet.textSync as ReturnType<typeof vi.fn>).mockImplementation(() => {
        throw new Error('figlet failed');
      });

      const { generateKiroxAsciiArt } = await import('../../../../src/cli/utilities/ascii-art-utils.js');
      const result = generateKiroxAsciiArt();

      expect(result).toBe('kirox\n');
      expect(figlet.textSync).toHaveBeenCalledTimes(1);
    });

    it('should return fallback text when figlet returns undefined', async () => {
      (figlet.textSync as ReturnType<typeof vi.fn>).mockReturnValue(undefined);

      const { generateKiroxAsciiArt } = await import('../../../../src/cli/utilities/ascii-art-utils.js');
      const result = generateKiroxAsciiArt();

      expect(result).toBe('kirox\n');
    });

    it('should return fallback text when figlet returns empty string', async () => {
      (figlet.textSync as ReturnType<typeof vi.fn>).mockReturnValue('');

      const { generateKiroxAsciiArt } = await import('../../../../src/cli/utilities/ascii-art-utils.js');
      const result = generateKiroxAsciiArt();

      expect(result).toBe('kirox\n');
    });
  });
});
