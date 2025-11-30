import { Octokit } from 'octokit';
import type { RateLimitInfo } from './types.js';

export function createGitHubClient(token?: string): Octokit {
  const authToken = token || process.env.GITHUB_TOKEN;

  return new Octokit({
    auth: authToken,
    userAgent: 'kirox-cli',
  });
}

export async function getRateLimit(client: Octokit): Promise<RateLimitInfo> {
  try {
    const response = await client.rest.rateLimit.get();

    const { remaining, limit, reset } = response.data.rate;

    return {
      remaining,
      limit,
      resetAt: new Date(reset * 1000),
    };
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to get rate limit: ${error.message}`);
    }
    throw error;
  }
}
