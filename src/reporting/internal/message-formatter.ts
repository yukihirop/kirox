import { Chalk } from 'chalk';

export class MessageFormatter {
  private readonly chalk: InstanceType<typeof Chalk>;

  constructor(useColor: boolean) {
    this.chalk = new Chalk({
      level: useColor ? 3 : 0,
    });
  }

  formatSuccess(message: string): string {
    return this.chalk.green(message);
  }

  formatError(message: string): string {
    return this.chalk.red(message);
  }

  formatProgress(fileName: string, current: number, total: number): string {
    const message = `[${current}/${total}] 📥 Fetching ${fileName}...`;
    return this.chalk.cyan(message);
  }

  formatInfo(message: string): string {
    return this.chalk.cyan(message);
  }

  formatWarning(message: string): string {
    return this.chalk.yellow(message);
  }
}
