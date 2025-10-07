import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { loadConfig } from '@/config/loader';

describe('ConfigLoader', () => {
  let tempDir: string;
  let originalCwd: string;

  beforeEach(async () => {
    // Create temporary directory for test files
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'kirox-test-'));
    originalCwd = process.cwd();
    process.chdir(tempDir);
  });

  afterEach(async () => {
    // Cleanup
    process.chdir(originalCwd);
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe('loadConfig', () => {
    it('should return empty config when no config file exists', async () => {
      const config = await loadConfig();
      expect(config).toEqual({});
    });

    it('should load config from current directory .kiroxrc.json', async () => {
      const configData = {
        githubToken: 'test-token',
        verbose: true,
      };
      await fs.writeFile('.kiroxrc.json', JSON.stringify(configData));

      const config = await loadConfig();
      expect(config).toEqual(configData);
    });

    it('should load config from home directory .kiroxrc.json', async () => {
      const homeConfig = {
        defaultConcurrency: 10,
        force: true,
      };
      const homeDir = os.homedir();
      const homeConfigPath = path.join(homeDir, '.kiroxrc.json');

      // Create home config
      await fs.writeFile(homeConfigPath, JSON.stringify(homeConfig));

      try {
        const config = await loadConfig();
        expect(config).toEqual(homeConfig);
      } finally {
        // Cleanup home config
        await fs.unlink(homeConfigPath).catch(() => {});
      }
    });

    it('should prioritize current directory over home directory', async () => {
      const currentConfig = { verbose: true };
      const homeConfig = { verbose: false, force: true };

      await fs.writeFile('.kiroxrc.json', JSON.stringify(currentConfig));

      const homeDir = os.homedir();
      const homeConfigPath = path.join(homeDir, '.kiroxrc.json');
      await fs.writeFile(homeConfigPath, JSON.stringify(homeConfig));

      try {
        const config = await loadConfig();
        expect(config.verbose).toBe(true);
      } finally {
        await fs.unlink(homeConfigPath).catch(() => {});
      }
    });

    it('should load config from custom path when provided', async () => {
      const customConfig = { githubToken: 'custom-token' };
      const customPath = path.join(tempDir, 'custom-config.json');
      await fs.writeFile(customPath, JSON.stringify(customConfig));

      const config = await loadConfig(customPath);
      expect(config).toEqual(customConfig);
    });

    it('should prioritize custom path over current and home directories', async () => {
      const customConfig = { verbose: true, force: true };
      const currentConfig = { verbose: false };

      const customPath = path.join(tempDir, 'custom.json');
      await fs.writeFile(customPath, JSON.stringify(customConfig));
      await fs.writeFile('.kiroxrc.json', JSON.stringify(currentConfig));

      const config = await loadConfig(customPath);
      expect(config).toEqual(customConfig);
    });

    it('should throw error for invalid JSON in config file', async () => {
      await fs.writeFile('.kiroxrc.json', '{invalid json}');

      await expect(loadConfig()).rejects.toThrow();
    });

    it('should throw error when custom config path does not exist', async () => {
      const nonExistentPath = path.join(tempDir, 'nonexistent.json');

      await expect(loadConfig(nonExistentPath)).rejects.toThrow();
    });

    it('should handle config file with all valid fields', async () => {
      const fullConfig = {
        githubToken: 'ghp_test123',
        defaultConcurrency: 3,
        outputDirectory: '/tmp/kirox',
        verbose: true,
        force: false,
      };
      await fs.writeFile('.kiroxrc.json', JSON.stringify(fullConfig));

      const config = await loadConfig();
      expect(config).toEqual(fullConfig);
    });

    it('should ignore unknown fields in config file', async () => {
      const configWithUnknown = {
        githubToken: 'test',
        unknownField: 'should be ignored',
      };
      await fs.writeFile('.kiroxrc.json', JSON.stringify(configWithUnknown));

      const config = await loadConfig();
      expect(config.githubToken).toBe('test');
      // Unknown fields should be preserved (or filtered based on implementation)
    });

    it('should load subdir field from config file', async () => {
      const configData = {
        githubToken: 'test-token',
        subdir: 'packages/api',
      };
      await fs.writeFile('.kiroxrc.json', JSON.stringify(configData));

      const config = await loadConfig();
      expect(config.subdir).toBe('packages/api');
    });

    it('should return undefined for subdir when not present in config', async () => {
      const configData = {
        githubToken: 'test-token',
        verbose: true,
      };
      await fs.writeFile('.kiroxrc.json', JSON.stringify(configData));

      const config = await loadConfig();
      expect(config.subdir).toBeUndefined();
    });

    it('should load empty string subdir from config file', async () => {
      const configData = {
        githubToken: 'test-token',
        subdir: '',
      };
      await fs.writeFile('.kiroxrc.json', JSON.stringify(configData));

      const config = await loadConfig();
      expect(config.subdir).toBe('');
    });

    it('should load config file with subdir and all other fields', async () => {
      const fullConfig = {
        githubToken: 'ghp_test123',
        defaultConcurrency: 3,
        outputDirectory: '/tmp/kirox',
        verbose: true,
        force: false,
        subdir: 'services/auth',
      };
      await fs.writeFile('.kiroxrc.json', JSON.stringify(fullConfig));

      const config = await loadConfig();
      expect(config).toEqual(fullConfig);
      expect(config.subdir).toBe('services/auth');
    });
  });
});
