export class Semaphore {
  private available: number;
  private readonly maxConcurrent: number;
  private readonly waitQueue: Array<() => void> = [];

  constructor(maxConcurrent: number) {
    if (maxConcurrent <= 0) {
      throw new Error('Semaphore max must be greater than 0');
    }
    this.maxConcurrent = maxConcurrent;
    this.available = maxConcurrent;
  }

  async acquire(): Promise<void> {
    if (this.available > 0) {
      this.available--;
      return Promise.resolve();
    }

    return new Promise<void>((resolve) => {
      this.waitQueue.push(resolve);
    });
  }

  release(): void {
    const nextResolve = this.waitQueue.shift();
    if (nextResolve) {
      nextResolve();
    } else {
      this.available++;
    }
  }

  getMax(): number {
    return this.maxConcurrent;
  }

  getAvailable(): number {
    return this.available;
  }

  getWaitingCount(): number {
    return this.waitQueue.length;
  }
}
