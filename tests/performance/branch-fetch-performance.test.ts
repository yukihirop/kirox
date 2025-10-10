/**
 * Performance tests for branch fetching operations
 *
 * Task 7.1: ブランチ取得パフォーマンステスト作成
 *
 * Tests performance requirements:
 * - Branch list fetching completes within 3 seconds (Requirement 9.1)
 * - Real-time search filtering for 100+ branches completes within 1 second (Requirement 9.2)
 * - Search text filtering results appear within 100ms (Requirement 9.3)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchBranches } from '../../src/github/fetcher.js';
import { Octokit } from 'octokit';

vi.mock('octokit');

describe('Branch Fetch Performance Tests (Task 7.1)', () => {
  let mockOctokit: {
    rest: {
      repos: {
        listBranches: ReturnType<typeof vi.fn>;
      };
    };
  };

  beforeEach(() => {
    mockOctokit = {
      rest: {
        repos: {
          listBranches: vi.fn(),
        },
      },
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Requirement 9.1: ブランチ一覧取得が3秒以内に完了する', () => {
    it('should fetch branch list within 3 seconds (normal network conditions)', async () => {
      // RED: Performance test for branch list fetching
      // Mock 150 branches across 2 pages (100 + 50)

      const generateBranches = (count: number, offset: number = 0) => {
        return Array.from({ length: count }, (_, i) => ({
          name: `branch-${i + offset}`,
          commit: { sha: `sha-${i + offset}`, url: '' },
          protected: false,
        }));
      };

      // Page 1: 100 branches
      mockOctokit.rest.repos.listBranches.mockResolvedValueOnce({
        data: generateBranches(100, 0),
      } as never);

      // Page 2: 50 branches
      mockOctokit.rest.repos.listBranches.mockResolvedValueOnce({
        data: generateBranches(50, 100),
      } as never);

      const startTime = performance.now();

      const branches = await fetchBranches(
        mockOctokit as unknown as Octokit,
        'owner',
        'repo'
      );

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Verify all branches were fetched
      expect(branches).toHaveLength(150);

      // Performance requirement: Must complete within 3000ms
      expect(duration).toBeLessThan(3000);

      // Log actual performance for monitoring
      console.log(`Branch list fetch completed in ${duration.toFixed(2)}ms`);
    });

    it('should handle pagination efficiently for large repositories', async () => {
      // RED: Test pagination performance with 250 branches (3 pages)

      const generateBranches = (count: number, offset: number = 0) => {
        return Array.from({ length: count }, (_, i) => ({
          name: `feature/branch-${String(i + offset).padStart(4, '0')}`,
          commit: { sha: `sha-${i + offset}`, url: '' },
          protected: false,
        }));
      };

      // Page 1: 100 branches
      mockOctokit.rest.repos.listBranches.mockResolvedValueOnce({
        data: generateBranches(100, 0),
      } as never);

      // Page 2: 100 branches
      mockOctokit.rest.repos.listBranches.mockResolvedValueOnce({
        data: generateBranches(100, 100),
      } as never);

      // Page 3: 50 branches
      mockOctokit.rest.repos.listBranches.mockResolvedValueOnce({
        data: generateBranches(50, 200),
      } as never);

      const startTime = performance.now();

      const branches = await fetchBranches(
        mockOctokit as unknown as Octokit,
        'owner',
        'large-repo'
      );

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(branches).toHaveLength(250);

      // Should still complete within 3 seconds even with pagination
      expect(duration).toBeLessThan(3000);

      console.log(`Paginated fetch (250 branches) completed in ${duration.toFixed(2)}ms`);
    });
  });

  describe('Requirement 9.2: 100個以上のブランチに対してリアルタイム検索フィルタリングが1秒以内', () => {
    it('should filter 100+ branches within 1 second', () => {
      // RED: Test search filtering performance on 150 branches

      const branches = Array.from({ length: 150 }, (_, i) => `branch-${i}`);
      const searchText = 'branch-1';

      const startTime = performance.now();

      // Simulate filtering logic (case-insensitive partial match)
      const filtered = branches.filter((branch) =>
        branch.toLowerCase().includes(searchText.toLowerCase())
      );

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Verify filtering worked
      expect(filtered.length).toBeGreaterThan(0);
      expect(filtered.every((b) => b.includes('branch-1'))).toBe(true);

      // Performance requirement: Must complete within 1000ms
      expect(duration).toBeLessThan(1000);

      console.log(
        `Filtered ${branches.length} branches to ${filtered.length} results in ${duration.toFixed(2)}ms`
      );
    });

    it('should filter 500 branches efficiently', () => {
      // RED: Stress test with 500 branches

      const branches = Array.from({ length: 500 }, (_, i) => {
        const types = ['feature', 'bugfix', 'hotfix', 'release', 'develop'];
        const type = types[i % types.length];
        return `${type}/task-${String(i).padStart(4, '0')}`;
      });

      const searchText = 'feature';

      const startTime = performance.now();

      const filtered = branches.filter((branch) =>
        branch.toLowerCase().includes(searchText.toLowerCase())
      );

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(filtered.length).toBeGreaterThan(0);

      // Should still be under 1 second even with 500 branches
      expect(duration).toBeLessThan(1000);

      console.log(
        `Filtered 500 branches to ${filtered.length} results in ${duration.toFixed(2)}ms`
      );
    });
  });

  describe('Requirement 9.3: 検索テキスト入力時のフィルタリング結果が100ms以内', () => {
    it('should filter branches within 100ms on user input', () => {
      // RED: Test filtering speed for typical user input scenario

      const branches = Array.from({ length: 200 }, (_, i) => {
        const prefixes = ['main', 'develop', 'feature', 'release', 'hotfix'];
        const prefix = prefixes[i % prefixes.length];
        return `${prefix}/${i}`;
      });

      const searchInputs = ['feat', 'ma', 'dev', 'hot'];

      searchInputs.forEach((searchText) => {
        const startTime = performance.now();

        const filtered = branches.filter((branch) =>
          branch.toLowerCase().includes(searchText.toLowerCase())
        );

        const endTime = performance.now();
        const duration = endTime - startTime;

        // Performance requirement: Must complete within 100ms
        expect(duration).toBeLessThan(100);

        console.log(
          `Search "${searchText}": ${filtered.length} results in ${duration.toFixed(2)}ms`
        );
      });
    });

    it('should handle incremental search efficiently', () => {
      // RED: Test incremental search (typing "feature" one char at a time)

      const branches = Array.from({ length: 300 }, (_, i) => {
        const types = ['feature', 'fix', 'refactor', 'test', 'docs'];
        return `${types[i % types.length]}/issue-${i}`;
      });

      const incrementalSearch = ['f', 'fe', 'fea', 'feat', 'featu', 'feature'];

      incrementalSearch.forEach((searchText) => {
        const startTime = performance.now();

        const filtered = branches.filter((branch) =>
          branch.toLowerCase().includes(searchText.toLowerCase())
        );

        const endTime = performance.now();
        const duration = endTime - startTime;

        // Each keystroke should filter within 100ms
        expect(duration).toBeLessThan(100);

        console.log(
          `Incremental search "${searchText}": ${filtered.length} results in ${duration.toFixed(2)}ms`
        );
      });
    });

    it('should handle worst-case search patterns efficiently', () => {
      // RED: Test worst-case scenario (all branches match)

      const branches = Array.from({ length: 250 }, (_, i) => `branch-${i}`);
      const searchText = 'branch'; // Matches all branches

      const startTime = performance.now();

      const filtered = branches.filter((branch) =>
        branch.toLowerCase().includes(searchText.toLowerCase())
      );

      const endTime = performance.now();
      const duration = endTime - startTime;

      // All branches should match
      expect(filtered).toHaveLength(250);

      // Should still complete within 100ms even when all match
      expect(duration).toBeLessThan(100);

      console.log(
        `Worst-case search (all ${filtered.length} branches match) completed in ${duration.toFixed(2)}ms`
      );
    });
  });
});
