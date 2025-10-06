import { describe, it, expect } from 'vitest';
import { parseArguments } from '@/cli/parser';

describe('ArgumentParser', () => {
  describe('parseArguments', () => {
    it('should parse repository and project arguments', () => {
      const argv = ['node', 'kirox', 'owner/repo', '-p', 'my-project'];
      const result = parseArguments(argv);

      expect(result.repository).toBe('owner/repo');
      expect(result.project).toBe('my-project');
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

    it('should throw error when repository is missing', () => {
      const argv = ['node', 'kirox', '-p', 'project'];

      expect(() => parseArguments(argv)).toThrow();
    });

    it('should throw error when project option is missing', () => {
      const argv = ['node', 'kirox', 'owner/repo'];

      expect(() => parseArguments(argv)).toThrow();
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

      expect(result.project).toBe('project');
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

      expect(result.track).toBe(false);
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
  });
});
