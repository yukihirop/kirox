import { createInterface } from 'readline';

export async function confirm(message: string): Promise<boolean> {
  return new Promise((resolve) => {
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    rl.question(`${message} (y/N): `, (answer: string) => {
      rl.close();

      const normalized = answer.trim().toLowerCase();
      const isConfirmed = normalized === 'y' || normalized === 'yes';

      resolve(isConfirmed);
    });
  });
}
