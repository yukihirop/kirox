/**
 * GitHub API Client
 *
 * Handles Octokit initialization, authentication, and rate limit monitoring
 */

import { Octokit } from 'octokit';
import type { RateLimitInfo } from './types.js';

/**
 * Create GitHub API client with optional authentication
 *
 * Authentication priority:
 * 1. Provided token parameter
 * 2. GITHUB_TOKEN environment variable
 * 3. Unauthenticated (public repos only, 60 req/h rate limit)
 *
 * @param token - Optional GitHub Personal Access Token
 * @returns Configured Octokit client instance
 */
export function createGitHubClient(token?: string): Octokit {
  const authToken = token || process.env.GITHUB_TOKEN;

  return new Octokit({
    auth: authToken,
    userAgent: 'kirox-cli',
  });
}

/**
 * Get current rate limit information from GitHub API
 *
 * @param client - Octokit client instance
 * @returns Rate limit information (remaining, limit, resetAt)
 * @throws Error if API request fails
 */
export async function getRateLimit(client: Octokit): Promise<RateLimitInfo> {
  try {
    const response = await client.rest.rateLimit.get();

    const { remaining, limit, reset } = response.data.rate;

    return {
      remaining,
      limit,
      resetAt: new Date(reset * 1000), // Convert Unix timestamp to Date
    };
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to get rate limit: ${error.message}`);
    }
    throw error;
  }
}
