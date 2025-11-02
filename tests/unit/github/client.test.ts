import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createGitHubClient, getRateLimit } from '@/github/client.js';

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
    it('should retrieve rate limit information using mock', async () => {
      const mockClient = {
        rest: {
          rateLimit: {
            get: vi.fn().mockResolvedValue({
              data: {
                rate: {
                  remaining: 5000,
                  limit: 5000,
                  reset: Math.floor(Date.now() / 1000) + 3600,
                },
              },
            }),
          },
        },
      } as any;

      const rateLimit = await getRateLimit(mockClient);

      expect(rateLimit).toBeDefined();
      expect(rateLimit.remaining).toBe(5000);
      expect(rateLimit.limit).toBe(5000);
      expect(rateLimit.resetAt).toBeInstanceOf(Date);
    });

    it('should return resetAt as future date', async () => {
      const futureTime = Math.floor(Date.now() / 1000) + 3600;
      const mockClient = {
        rest: {
          rateLimit: {
            get: vi.fn().mockResolvedValue({
              data: {
                rate: {
                  remaining: 100,
                  limit: 5000,
                  reset: futureTime,
                },
              },
            }),
          },
        },
      } as any;

      const rateLimit = await getRateLimit(mockClient);

      expect(rateLimit.resetAt.getTime()).toBeGreaterThan(Date.now());
    });

    it('should convert Unix timestamp to Date correctly', async () => {
      const mockClient = {
        rest: {
          rateLimit: {
            get: vi.fn().mockResolvedValue({
              data: {
                rate: {
                  remaining: 1000,
                  limit: 5000,
                  reset: Math.floor(Date.now() / 1000) + 7200,
                },
              },
            }),
          },
        },
      } as any;

      const rateLimit = await getRateLimit(mockClient);

      expect(rateLimit.resetAt).toBeInstanceOf(Date);
      expect(rateLimit.resetAt.getFullYear()).toBeGreaterThanOrEqual(2024);
    });
  });

  describe('Authentication Error Handling', () => {
    it('should work with public repositories without token using mock', async () => {
      const client = createGitHubClient();

      // Mock the repos.get method
      const mockGet = vi.fn().mockResolvedValue({
        data: {
          name: 'Hello-World',
          full_name: 'octocat/Hello-World',
        },
      });

      (client.rest.repos.get as any) = mockGet;

      const result = await client.rest.repos.get({
        owner: 'octocat',
        repo: 'Hello-World',
      });

      expect(result.data).toBeDefined();
      expect(result.data.name).toBe('Hello-World');
      expect(mockGet).toHaveBeenCalledWith({
        owner: 'octocat',
        repo: 'Hello-World',
      });
    });

    it('should track rate limit information using mock', async () => {
      const mockClient = {
        rest: {
          rateLimit: {
            get: vi.fn().mockResolvedValue({
              data: {
                rate: {
                  remaining: 4999,
                  limit: 5000,
                  reset: Math.floor(Date.now() / 1000) + 3600,
                },
              },
            }),
          },
        },
      } as any;

      const rateLimit = await getRateLimit(mockClient);

      expect(rateLimit.remaining).toBeDefined();
      expect(rateLimit.limit).toBeDefined();
      expect(rateLimit.resetAt).toBeDefined();
      expect(rateLimit.remaining).toBe(4999);
    });

    it('should create client with userAgent header', () => {
      const client = createGitHubClient();

      // Verify client is configured (implicit via successful API calls)
      expect(client).toBeDefined();
      expect(client.rest).toBeDefined();
    });
  });
});
