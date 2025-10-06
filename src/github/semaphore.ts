/**
 * Semaphore for Concurrency Control
 *
 * Implements a semaphore pattern to limit the number of concurrent operations
 */

/**
 * Semaphore for controlling concurrency
 *
 * @example
 * const semaphore = new Semaphore(3); // Max 3 concurrent operations
 *
 * async function task() {
 *   await semaphore.acquire();
 *   try {
 *     // Perform async operation
 *   } finally {
 *     semaphore.release();
 *   }
 * }
 */
export class Semaphore {
  private available: number;
  private readonly maxConcurrent: number;
  private readonly waitQueue: Array<() => void> = [];

  /**
   * Create a new semaphore
   *
   * @param maxConcurrent - Maximum number of concurrent operations allowed
   */
  constructor(maxConcurrent: number) {
    if (maxConcurrent <= 0) {
      throw new Error('Semaphore max must be greater than 0');
    }
    this.maxConcurrent = maxConcurrent;
    this.available = maxConcurrent;
  }

  /**
   * Acquire semaphore slot (wait if all slots are busy)
   *
   * @returns Promise that resolves when a slot is available
   */
  async acquire(): Promise<void> {
    if (this.available > 0) {
      this.available--;
      return Promise.resolve();
    }

    return new Promise<void>((resolve) => {
      this.waitQueue.push(resolve);
    });
  }

  /**
   * Release semaphore slot (notify waiting tasks)
   *
   * Should be called in a finally block to ensure release even on error
   */
  release(): void {
    const nextResolve = this.waitQueue.shift();
    if (nextResolve) {
      // Immediately give the slot to the next waiting task
      nextResolve();
    } else {
      // No one waiting, increment available slots
      this.available++;
    }
  }

  /**
   * Get maximum number of concurrent operations
   *
   * @returns Maximum concurrency limit
   */
  getMax(): number {
    return this.maxConcurrent;
  }

  /**
   * Get current number of available slots
   *
   * @returns Number of available slots
   */
  getAvailable(): number {
    return this.available;
  }

  /**
   * Get number of tasks waiting in queue
   *
   * @returns Number of waiting tasks
   */
  getWaitingCount(): number {
    return this.waitQueue.length;
  }
}
