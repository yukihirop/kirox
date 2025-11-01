/**
 * Unit tests for Semaphore class
 */

import { describe, it, expect } from 'vitest';
import { Semaphore } from '@/github/semaphore.js';

describe('Semaphore', () => {
  describe('constructor', () => {
    it('should create semaphore with valid max value', () => {
      const semaphore = new Semaphore(5);
      expect(semaphore.getAvailable()).toBe(5);
    });

    it('should throw error for max value <= 0', () => {
      expect(() => new Semaphore(0)).toThrow('Semaphore max must be greater than 0');
      expect(() => new Semaphore(-1)).toThrow('Semaphore max must be greater than 0');
    });
  });

  describe('acquire and release', () => {
    it('should acquire slot immediately when available', async () => {
      const semaphore = new Semaphore(3);

      await semaphore.acquire();
      expect(semaphore.getAvailable()).toBe(2);

      await semaphore.acquire();
      expect(semaphore.getAvailable()).toBe(1);
    });

    it('should release slot and increment available count', async () => {
      const semaphore = new Semaphore(3);

      await semaphore.acquire();
      expect(semaphore.getAvailable()).toBe(2);

      semaphore.release();
      expect(semaphore.getAvailable()).toBe(3);
    });

    it('should queue requests when all slots are busy', async () => {
      const semaphore = new Semaphore(2);

      // Acquire all slots
      await semaphore.acquire();
      await semaphore.acquire();
      expect(semaphore.getAvailable()).toBe(0);

      // Third acquire should queue
      const acquirePromise = semaphore.acquire();
      expect(semaphore.getWaitingCount()).toBe(1);

      // Release one slot
      semaphore.release();

      // Queued request should be resolved
      await acquirePromise;
      expect(semaphore.getAvailable()).toBe(0);
      expect(semaphore.getWaitingCount()).toBe(0);
    });

    it('should handle multiple queued requests in FIFO order', async () => {
      const semaphore = new Semaphore(1);

      const executionOrder: number[] = [];

      // Acquire the only slot
      await semaphore.acquire();

      // Queue multiple requests
      const task1 = semaphore.acquire().then(() => executionOrder.push(1));
      const task2 = semaphore.acquire().then(() => executionOrder.push(2));
      const task3 = semaphore.acquire().then(() => executionOrder.push(3));

      expect(semaphore.getWaitingCount()).toBe(3);

      // Release slot for task1
      semaphore.release();
      await task1;
      expect(executionOrder).toEqual([1]);

      // Release slot for task2
      semaphore.release();
      await task2;
      expect(executionOrder).toEqual([1, 2]);

      // Release slot for task3
      semaphore.release();
      await task3;
      expect(executionOrder).toEqual([1, 2, 3]);
    });
  });

  describe('concurrent operations', () => {
    it('should respect concurrency limit', async () => {
      const semaphore = new Semaphore(3);
      let currentConcurrent = 0;
      let maxConcurrentObserved = 0;

      const task = async (id: number) => {
        await semaphore.acquire();
        try {
          currentConcurrent++;
          maxConcurrentObserved = Math.max(maxConcurrentObserved, currentConcurrent);

          // Simulate async work
          await new Promise((resolve) => setTimeout(resolve, 10));

          currentConcurrent--;
        } finally {
          semaphore.release();
        }
      };

      // Run 10 tasks
      const tasks = Array.from({ length: 10 }, (_, i) => task(i));
      await Promise.all(tasks);

      // Max concurrent should not exceed 3
      expect(maxConcurrentObserved).toBeLessThanOrEqual(3);
      expect(maxConcurrentObserved).toBeGreaterThan(0);

      // All slots should be released
      expect(semaphore.getAvailable()).toBe(3);
      expect(semaphore.getWaitingCount()).toBe(0);
    });

    it('should handle errors in tasks without deadlock', async () => {
      const semaphore = new Semaphore(2);

      const successTask = async () => {
        await semaphore.acquire();
        try {
          await new Promise((resolve) => setTimeout(resolve, 10));
        } finally {
          semaphore.release();
        }
      };

      const errorTask = async () => {
        await semaphore.acquire();
        try {
          throw new Error('Task error');
        } finally {
          semaphore.release();
        }
      };

      const tasks = [
        successTask(),
        errorTask().catch(() => {}), // Catch error to prevent unhandled rejection
        successTask(),
      ];

      await Promise.allSettled(tasks);

      // All slots should be released even with errors
      expect(semaphore.getAvailable()).toBe(2);
      expect(semaphore.getWaitingCount()).toBe(0);
    });
  });

  describe('getAvailable and getWaitingCount', () => {
    it('should return correct available count', async () => {
      const semaphore = new Semaphore(5);

      expect(semaphore.getAvailable()).toBe(5);

      await semaphore.acquire();
      expect(semaphore.getAvailable()).toBe(4);

      await semaphore.acquire();
      expect(semaphore.getAvailable()).toBe(3);

      semaphore.release();
      expect(semaphore.getAvailable()).toBe(4);
    });

    it('should return correct waiting count', async () => {
      const semaphore = new Semaphore(1);

      expect(semaphore.getWaitingCount()).toBe(0);

      await semaphore.acquire();
      expect(semaphore.getWaitingCount()).toBe(0);

      const p1 = semaphore.acquire();
      expect(semaphore.getWaitingCount()).toBe(1);

      const p2 = semaphore.acquire();
      expect(semaphore.getWaitingCount()).toBe(2);

      semaphore.release();
      await p1;
      expect(semaphore.getWaitingCount()).toBe(1);

      semaphore.release();
      await p2;
      expect(semaphore.getWaitingCount()).toBe(0);
    });
  });
});
