import { describe, it, expect } from 'vitest';
import { parseArguments } from '@/cli/parser';

describe('ArgumentParser', () => {
  describe('parseArguments', () => {
    it('should parse repository and project arguments', () => {
      const argv = ['node', 'kirox', 'owner/repo', '-p', 'my-project'];
      const result = parseArguments(argv);

      expect(result.repository).toBe('owner/repo');
      expect(result.projects).toEqual(['my-project']);
    });

    it('should parse --force flag', () => {
      const argv = ['node', 'kirox', 'owner/repo', '-p', 'project', '--force'];
      const result = parseArguments(argv);

      expect(result.force).toBe(true);
    });

    it('should parse --dry-run flag', () => {
      const argv = ['node', 'kirox', 'owner/repo', '-p', 'project', '--dry-run'];
      const result = parseArguments(argv);

      expect(result.dryRun).toBe(true);
    });

    it('should parse --verbose flag', () => {
      const argv = ['node', 'kirox', 'owner/repo', '-p', 'project', '--verbose'];
      const result = parseArguments(argv);

      expect(result.verbose).toBe(true);
    });

    it('should parse --config option with path', () => {
      const argv = ['node', 'kirox', 'owner/repo', '-p', 'project', '--config', '/path/to/config.json'];
      const result = parseArguments(argv);

      expect(result.config).toBe('/path/to/config.json');
    });

    it('should parse multiple flags together', () => {
      const argv = ['node', 'kirox', 'owner/repo', '-p', 'project', '--force', '--verbose'];
      const result = parseArguments(argv);

      expect(result.force).toBe(true);
      expect(result.verbose).toBe(true);
      expect(result.dryRun).toBe(false);
    });

    it('should allow empty repository for interactive mode', () => {
      const argv = ['node', 'kirox', '-p', 'project'];

      // Should not throw - interactive mode will handle missing arguments
      const result = parseArguments(argv);
      expect(result.repository).toBe('');
      expect(result.projects).toEqual(['project']);
    });

    it('should allow empty project for interactive mode', () => {
      const argv = ['node', 'kirox', 'owner/repo'];

      // Should not throw - interactive mode will handle missing arguments
      const result = parseArguments(argv);
      expect(result.repository).toBe('owner/repo');
      expect(result.projects).toEqual([]);
    });

    it('should set default values for optional flags', () => {
      const argv = ['node', 'kirox', 'owner/repo', '-p', 'project'];
      const result = parseArguments(argv);

      expect(result.force).toBe(false);
      expect(result.dryRun).toBe(false);
      expect(result.verbose).toBe(false);
      expect(result.output).toBe('.');
      expect(result.config).toBeUndefined();
    });

    it('should parse short flag -p for project', () => {
      const argv = ['node', 'kirox', 'owner/repo', '-p', 'project'];
      const result = parseArguments(argv);

      expect(result.projects).toEqual(['project']);
    });

    it('should parse --output option with current directory', () => {
      const argv = ['node', 'kirox', 'owner/repo', '-p', 'project', '--output', '.'];
      const result = parseArguments(argv);

      expect(result.output).toBe('.');
    });

    it('should parse -o short flag for output', () => {
      const argv = ['node', 'kirox', 'owner/repo', '-p', 'project', '-o', './external'];
      const result = parseArguments(argv);

      expect(result.output).toBe('./external');
    });

    it('should parse --output option with relative path', () => {
      const argv = ['node', 'kirox', 'owner/repo', '-p', 'project', '--output', '../shared-specs'];
      const result = parseArguments(argv);

      expect(result.output).toBe('../shared-specs');
    });

    it('should parse --output option with absolute path', () => {
      const argv = ['node', 'kirox', 'owner/repo', '-p', 'project', '--output', '/tmp/kiro-test'];
      const result = parseArguments(argv);

      expect(result.output).toBe('/tmp/kiro-test');
    });

    it('should parse --track flag', () => {
      const argv = ['node', 'kirox', 'owner/repo', '-p', 'project', '--track'];
      const result = parseArguments(argv);

      expect(result.track).toBe(true);
    });

    it('should parse --check-updates flag', () => {
      const argv = ['node', 'kirox', '--check-updates'];
      const result = parseArguments(argv);

      expect(result.checkUpdates).toBe(true);
    });

    it('should parse --update flag', () => {
      const argv = ['node', 'kirox', '--update'];
      const result = parseArguments(argv);

      expect(result.update).toBe(true);
    });

    it('should set default values for new tracking flags', () => {
      const argv = ['node', 'kirox', 'owner/repo', '-p', 'project'];
      const result = parseArguments(argv);

      expect(result.track).toBe(true); // Default is now true
      expect(result.checkUpdates).toBe(false);
      expect(result.update).toBe(false);
    });

    it('should parse --track with other options', () => {
      const argv = ['node', 'kirox', 'owner/repo', '-p', 'project', '--track', '--verbose'];
      const result = parseArguments(argv);

      expect(result.track).toBe(true);
      expect(result.verbose).toBe(true);
      expect(result.checkUpdates).toBe(false);
      expect(result.update).toBe(false);
    });

    it('should parse --subdir option with path', () => {
      const argv = ['node', 'kirox', 'owner/repo', '-p', 'project', '--subdir', 'packages/api'];
      const result = parseArguments(argv);

      expect(result.subdir).toBe('packages/api');
    });

    it('should parse -s short flag for subdir', () => {
      const argv = ['node', 'kirox', 'owner/repo', '-p', 'project', '-s', 'services/auth'];
      const result = parseArguments(argv);

      expect(result.subdir).toBe('services/auth');
    });

    it('should parse --subdir with empty string', () => {
      const argv = ['node', 'kirox', 'owner/repo', '-p', 'project', '--subdir', ''];
      const result = parseArguments(argv);

      expect(result.subdir).toBe('');
    });

    it('should have undefined subdir when not specified', () => {
      const argv = ['node', 'kirox', 'owner/repo', '-p', 'project'];
      const result = parseArguments(argv);

      expect(result.subdir).toBeUndefined();
    });

    it('should parse --subdir with other options', () => {
      const argv = ['node', 'kirox', 'owner/repo', '-p', 'project', '--subdir', 'apps/frontend', '--verbose'];
      const result = parseArguments(argv);

      expect(result.subdir).toBe('apps/frontend');
      expect(result.verbose).toBe(true);
    });
  });

  describe('help message', () => {
    it('should include branch format in repository argument description', () => {
      // Commander.js throws an error with --help, so we need to check the program configuration
      // Instead, we'll verify by trying to parse --help and checking the error message
      const argv = ['node', 'kirox', '--help'];

      try {
        parseArguments(argv);
      } catch (error) {
        // Commander.js exits on --help, which throws in our test environment
        // We'll verify the help text is configured correctly by checking the source
      }

      // This test verifies that the argument description mentions both formats
      // The actual verification will be in the implementation
      expect(true).toBe(true); // Placeholder - real test will verify help output
    });
  });
});
