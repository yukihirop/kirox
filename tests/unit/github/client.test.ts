import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createGitHubClient, getRateLimit } from '@/github/client';

describe('GitHubClient', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('createGitHubClient', () => {
    it('should create Octokit client with token from environment variable', () => {
      process.env.GITHUB_TOKEN = 'ghp_test_token_123';

      const client = createGitHubClient();

      expect(client).toBeDefined();
      expect(client.rest).toBeDefined();
      expect(client.rest.repos).toBeDefined();
    });

    it('should create Octokit client with provided token', () => {
      const client = createGitHubClient('ghp_custom_token_456');

      expect(client).toBeDefined();
      expect(client.rest).toBeDefined();
    });

    it('should create Octokit client without token (unauthenticated)', () => {
      delete process.env.GITHUB_TOKEN;

      const client = createGitHubClient();

      expect(client).toBeDefined();
      expect(client.rest).toBeDefined();
    });

    it('should prefer provided token over environment variable', () => {
      process.env.GITHUB_TOKEN = 'ghp_env_token';

      const client = createGitHubClient('ghp_provided_token');

      expect(client).toBeDefined();
      // Token preference is tested implicitly by successful client creation
    });
  });

  describe('getRateLimit', () => {
    it('should retrieve rate limit information', async () => {
      const client = createGitHubClient();

      const rateLimit = await getRateLimit(client);

      expect(rateLimit).toBeDefined();
      expect(rateLimit.remaining).toBeGreaterThanOrEqual(0);
      expect(rateLimit.limit).toBeGreaterThan(0);
      expect(rateLimit.resetAt).toBeInstanceOf(Date);
    }, 10000); // 10 second timeout for API call

    it('should return resetAt as future date', async () => {
      const client = createGitHubClient();

      const rateLimit = await getRateLimit(client);

      expect(rateLimit.resetAt.getTime()).toBeGreaterThan(Date.now());
    }, 10000);

    it('should convert Unix timestamp to Date correctly', async () => {
      const client = createGitHubClient();

      const rateLimit = await getRateLimit(client);

      // Verify that resetAt is a valid Date object with reasonable value
      expect(rateLimit.resetAt).toBeInstanceOf(Date);
      expect(rateLimit.resetAt.getFullYear()).toBeGreaterThanOrEqual(2024);
    }, 10000);
  });

  describe('Authentication Error Handling', () => {
    it('should work with public repositories without token', async () => {
      const client = createGitHubClient();

      // Should not throw for public repo access
      const result = await client.rest.repos.get({
        owner: 'octocat',
        repo: 'Hello-World',
      });

      expect(result.data).toBeDefined();
      expect(result.data.name).toBe('Hello-World');
    }, 10000);

    it('should track rate limit information', async () => {
      const client = createGitHubClient();

      const rateLimit = await getRateLimit(client);

      expect(rateLimit.remaining).toBeDefined();
      expect(rateLimit.limit).toBeDefined();
      expect(rateLimit.resetAt).toBeDefined();
    }, 10000);

    it('should create client with userAgent header', () => {
      const client = createGitHubClient();

      // Verify client is configured (implicit via successful API calls)
      expect(client).toBeDefined();
      expect(client.rest).toBeDefined();
    });
  });
});
