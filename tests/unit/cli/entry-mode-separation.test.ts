/**
 * Entry Mode Separation Tests
 *
 * Task 4.4: Tests for separated interactive/non-interactive execution paths
 * Verifies that mode detection and execution path routing work correctly
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ParsedArguments } from '../../../src/cli/types.js';

/**
 * Determine execution mode based on parsed arguments
 * Returns 'interactive', 'non-interactive', 'check-updates', or 'update'
 */
export function determineExecutionMode(args: ParsedArguments): string {
  if (args.checkUpdates) return 'check-updates';
  if (args.update) return 'update';

  // Interactive mode: no repository or no projects specified
  if (!args.repository || args.projects.length === 0) {
    return 'interactive';
  }

  return 'non-interactive';
}

/**
 * Route to appropriate execution handler based on mode
 */
export interface ExecutionHandlers {
  handleInteractiveMode: (args: ParsedArguments) => Promise<unknown>;
  handleNonInteractiveMode: (args: ParsedArguments) => Promise<unknown>;
  handleCheckUpdates: (args: ParsedArguments) => Promise<unknown>;
  handleUpdate: (args: ParsedArguments) => Promise<unknown>;
}

export async function routeExecution(
  args: ParsedArguments,
  handlers: ExecutionHandlers
): Promise<unknown> {
  const mode = determineExecutionMode(args);

  switch (mode) {
    case 'interactive':
      return await handlers.handleInteractiveMode(args);
    case 'check-updates':
      return await handlers.handleCheckUpdates(args);
    case 'update':
      return await handlers.handleUpdate(args);
    case 'non-interactive':
    default:
      return await handlers.handleNonInteractiveMode(args);
  }
}

describe('Entry Mode Separation', () => {
  describe('determineExecutionMode', () => {
    it('should return "check-updates" when checkUpdates flag is true', () => {
      const args: ParsedArguments = {
        repository: 'owner/repo',
        projects: ['project1'],
        checkUpdates: true,
        update: false,
        steering: false,
        track: false,
        output: '.kiro',
        config: undefined,
        verbose: false,
        subdir: undefined,
        branch: undefined,
      };

      expect(determineExecutionMode(args)).toBe('check-updates');
    });

    it('should return "update" when update flag is true', () => {
      const args: ParsedArguments = {
        repository: 'owner/repo',
        projects: ['project1'],
        checkUpdates: false,
        update: true,
        steering: false,
        track: false,
        output: '.kiro',
        config: undefined,
        verbose: false,
        subdir: undefined,
        branch: undefined,
      };

      expect(determineExecutionMode(args)).toBe('update');
    });

    it('should return "interactive" when repository is missing', () => {
      const args: ParsedArguments = {
        repository: '',
        projects: [],
        checkUpdates: false,
        update: false,
        steering: false,
        track: false,
        output: '.kiro',
        config: undefined,
        verbose: false,
        subdir: undefined,
        branch: undefined,
      };

      expect(determineExecutionMode(args)).toBe('interactive');
    });

    it('should return "interactive" when projects array is empty', () => {
      const args: ParsedArguments = {
        repository: 'owner/repo',
        projects: [],
        checkUpdates: false,
        update: false,
        steering: false,
        track: false,
        output: '.kiro',
        config: undefined,
        verbose: false,
        subdir: undefined,
        branch: undefined,
      };

      expect(determineExecutionMode(args)).toBe('interactive');
    });

    it('should return "non-interactive" when all required args are present', () => {
      const args: ParsedArguments = {
        repository: 'owner/repo',
        projects: ['project1'],
        checkUpdates: false,
        update: false,
        steering: false,
        track: false,
        output: '.kiro',
        config: undefined,
        verbose: false,
        subdir: undefined,
        branch: undefined,
      };

      expect(determineExecutionMode(args)).toBe('non-interactive');
    });

    it('should prioritize checkUpdates over interactive mode', () => {
      const args: ParsedArguments = {
        repository: '',
        projects: [],
        checkUpdates: true,
        update: false,
        steering: false,
        track: false,
        output: '.kiro',
        config: undefined,
        verbose: false,
        subdir: undefined,
        branch: undefined,
      };

      expect(determineExecutionMode(args)).toBe('check-updates');
    });

    it('should prioritize update over interactive mode', () => {
      const args: ParsedArguments = {
        repository: '',
        projects: [],
        checkUpdates: false,
        update: true,
        steering: false,
        track: false,
        output: '.kiro',
        config: undefined,
        verbose: false,
        subdir: undefined,
        branch: undefined,
      };

      expect(determineExecutionMode(args)).toBe('update');
    });
  });

  describe('routeExecution', () => {
    let mockHandlers: ExecutionHandlers;

    beforeEach(() => {
      mockHandlers = {
        handleInteractiveMode: vi.fn().mockResolvedValue({ mode: 'interactive' }),
        handleNonInteractiveMode: vi.fn().mockResolvedValue({ mode: 'non-interactive' }),
        handleCheckUpdates: vi.fn().mockResolvedValue({ mode: 'check-updates' }),
        handleUpdate: vi.fn().mockResolvedValue({ mode: 'update' }),
      };
    });

    it('should route to interactive handler when mode is interactive', async () => {
      const args: ParsedArguments = {
        repository: '',
        projects: [],
        checkUpdates: false,
        update: false,
        steering: false,
        track: false,
        output: '.kiro',
        config: undefined,
        verbose: false,
        subdir: undefined,
        branch: undefined,
      };

      const result = await routeExecution(args, mockHandlers);

      expect(mockHandlers.handleInteractiveMode).toHaveBeenCalledWith(args);
      expect(mockHandlers.handleNonInteractiveMode).not.toHaveBeenCalled();
      expect(result).toEqual({ mode: 'interactive' });
    });

    it('should route to non-interactive handler when mode is non-interactive', async () => {
      const args: ParsedArguments = {
        repository: 'owner/repo',
        projects: ['project1'],
        checkUpdates: false,
        update: false,
        steering: false,
        track: false,
        output: '.kiro',
        config: undefined,
        verbose: false,
        subdir: undefined,
        branch: undefined,
      };

      const result = await routeExecution(args, mockHandlers);

      expect(mockHandlers.handleNonInteractiveMode).toHaveBeenCalledWith(args);
      expect(mockHandlers.handleInteractiveMode).not.toHaveBeenCalled();
      expect(result).toEqual({ mode: 'non-interactive' });
    });

    it('should route to check-updates handler when checkUpdates is true', async () => {
      const args: ParsedArguments = {
        repository: 'owner/repo',
        projects: ['project1'],
        checkUpdates: true,
        update: false,
        steering: false,
        track: false,
        output: '.kiro',
        config: undefined,
        verbose: false,
        subdir: undefined,
        branch: undefined,
      };

      const result = await routeExecution(args, mockHandlers);

      expect(mockHandlers.handleCheckUpdates).toHaveBeenCalledWith(args);
      expect(mockHandlers.handleInteractiveMode).not.toHaveBeenCalled();
      expect(mockHandlers.handleNonInteractiveMode).not.toHaveBeenCalled();
      expect(result).toEqual({ mode: 'check-updates' });
    });

    it('should route to update handler when update is true', async () => {
      const args: ParsedArguments = {
        repository: 'owner/repo',
        projects: ['project1'],
        checkUpdates: false,
        update: true,
        steering: false,
        track: false,
        output: '.kiro',
        config: undefined,
        verbose: false,
        subdir: undefined,
        branch: undefined,
      };

      const result = await routeExecution(args, mockHandlers);

      expect(mockHandlers.handleUpdate).toHaveBeenCalledWith(args);
      expect(mockHandlers.handleInteractiveMode).not.toHaveBeenCalled();
      expect(mockHandlers.handleNonInteractiveMode).not.toHaveBeenCalled();
      expect(result).toEqual({ mode: 'update' });
    });
  });
});
