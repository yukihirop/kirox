/**
 * Unit tests for SpinnerManager
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import ora, { type Ora } from 'ora';

// Mock ora module
vi.mock('ora');

describe('SpinnerManager', () => {
  let mockSpinner: Partial<Ora>;
  let mockOraFactory: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create mock spinner instance
    mockSpinner = {
      start: vi.fn().mockReturnThis(),
      stop: vi.fn().mockReturnThis(),
      succeed: vi.fn().mockReturnThis(),
      fail: vi.fn().mockReturnThis(),
      isSpinning: false,
      text: '',
    };

    // Mock ora factory function
    mockOraFactory = vi.fn().mockReturnValue(mockSpinner);
    (ora as unknown as ReturnType<typeof vi.fn>) = mockOraFactory;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with default ora options and verbose flag', async () => {
      const { SpinnerManager } = await import('../../../../src/reporting/internal/spinner-manager.js');

      const manager = new SpinnerManager({ color: true, isEnabled: true }, false);

      expect(manager).toBeDefined();
    });

    it('should set useFallback to true when ora initialization fails', async () => {
      mockOraFactory.mockImplementation(() => {
        throw new Error('Ora initialization failed');
      });

      const { SpinnerManager } = await import('../../../../src/reporting/internal/spinner-manager.js');

      const manager = new SpinnerManager({ color: true, isEnabled: true }, false);

      // startSpinner should return null in fallback mode
      const spinner = manager.startSpinner('test-key', 'Test message');
      expect(spinner).toBeNull();
    });

    it('should log warning in verbose mode when ora fails', async () => {
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      mockOraFactory.mockImplementation(() => {
        throw new Error('Ora initialization failed');
      });

      const { SpinnerManager } = await import('../../../../src/reporting/internal/spinner-manager.js');

      new SpinnerManager({ color: true, isEnabled: true }, true);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Spinner initialization failed')
      );

      consoleLogSpy.mockRestore();
    });
  });

  describe('startSpinner', () => {
    it('should create and start a new spinner with the given key and text', async () => {
      const { SpinnerManager } = await import('../../../../src/reporting/internal/spinner-manager.js');

      const manager = new SpinnerManager({ color: true, isEnabled: true }, false);
      const spinner = manager.startSpinner('project1', 'Fetching files...');

      expect(mockOraFactory).toHaveBeenCalledWith({ color: true, isEnabled: true });
      expect(mockSpinner.start).toHaveBeenCalledWith('Fetching files...');
      expect(spinner).toBe(mockSpinner);
    });

    it('should return existing spinner if already exists and is spinning', async () => {
      mockSpinner.isSpinning = true;

      const { SpinnerManager } = await import('../../../../src/reporting/internal/spinner-manager.js');

      const manager = new SpinnerManager({ color: true, isEnabled: true }, false);
      const spinner1 = manager.startSpinner('project1', 'Message 1');
      const spinner2 = manager.startSpinner('project1', 'Message 2');

      expect(spinner1).toBe(spinner2);
      // 1 for constructor test, 1 for first startSpinner (second startSpinner reuses)
      expect(mockOraFactory).toHaveBeenCalledTimes(2);
    });

    it('should create new spinner if existing one is stopped', async () => {
      // Create separate mock spinners for each call
      const mockSpinner1: Partial<Ora> = {
        start: vi.fn().mockReturnThis(),
        stop: vi.fn().mockReturnThis(),
        isSpinning: false,
        text: '',
      };
      const mockSpinner2: Partial<Ora> = {
        start: vi.fn().mockReturnThis(),
        stop: vi.fn().mockReturnThis(),
        isSpinning: false,
        text: '',
      };

      mockOraFactory
        .mockReturnValueOnce(mockSpinner) // Constructor test
        .mockReturnValueOnce(mockSpinner1) // First startSpinner
        .mockReturnValueOnce(mockSpinner2); // Second startSpinner

      const { SpinnerManager } = await import('../../../../src/reporting/internal/spinner-manager.js');

      const manager = new SpinnerManager({ color: true, isEnabled: true }, false);

      const spinner1 = manager.startSpinner('project1', 'Message 1');
      const spinner2 = manager.startSpinner('project1', 'Message 2');

      // 1 for constructor test, 1 for first startSpinner, 1 for second startSpinner
      expect(mockOraFactory).toHaveBeenCalledTimes(3);
      expect(spinner1).not.toBe(spinner2);
    });

    it('should return null in fallback mode', async () => {
      mockOraFactory.mockImplementation(() => {
        throw new Error('Ora initialization failed');
      });

      const { SpinnerManager } = await import('../../../../src/reporting/internal/spinner-manager.js');

      const manager = new SpinnerManager({ color: true, isEnabled: true }, false);
      const spinner = manager.startSpinner('project1', 'Fetching files...');

      expect(spinner).toBeNull();
    });

    it('should use empty string as key when key is undefined', async () => {
      const { SpinnerManager } = await import('../../../../src/reporting/internal/spinner-manager.js');

      const manager = new SpinnerManager({ color: true, isEnabled: true }, false);
      const spinner = manager.startSpinner('', 'Default spinner');

      expect(spinner).toBe(mockSpinner);
      expect(mockSpinner.start).toHaveBeenCalledWith('Default spinner');
    });
  });

  describe('updateSpinner', () => {
    it('should update existing spinner text', async () => {
      mockSpinner.isSpinning = true;

      const { SpinnerManager } = await import('../../../../src/reporting/internal/spinner-manager.js');

      const manager = new SpinnerManager({ color: true, isEnabled: true }, false);
      manager.startSpinner('project1', 'Initial message');
      manager.updateSpinner('project1', 'Updated message');

      expect(mockSpinner.text).toBe('Updated message');
    });

    it('should do nothing if spinner does not exist', async () => {
      const { SpinnerManager } = await import('../../../../src/reporting/internal/spinner-manager.js');

      const manager = new SpinnerManager({ color: true, isEnabled: true }, false);

      // Should not throw error
      expect(() => {
        manager.updateSpinner('nonexistent', 'Message');
      }).not.toThrow();
    });

    it('should do nothing in fallback mode', async () => {
      mockOraFactory.mockImplementation(() => {
        throw new Error('Ora initialization failed');
      });

      const { SpinnerManager } = await import('../../../../src/reporting/internal/spinner-manager.js');

      const manager = new SpinnerManager({ color: true, isEnabled: true }, false);

      // Should not throw error
      expect(() => {
        manager.updateSpinner('project1', 'Message');
      }).not.toThrow();
    });
  });

  describe('stopSpinner', () => {
    it('should stop spinner with default symbol', async () => {
      mockSpinner.isSpinning = true;

      const { SpinnerManager } = await import('../../../../src/reporting/internal/spinner-manager.js');

      const manager = new SpinnerManager({ color: true, isEnabled: true }, false);
      manager.startSpinner('project1', 'Message');
      manager.stopSpinner('project1');

      expect(mockSpinner.stop).toHaveBeenCalled();
    });

    it('should stop spinner with success symbol', async () => {
      mockSpinner.isSpinning = true;

      const { SpinnerManager } = await import('../../../../src/reporting/internal/spinner-manager.js');

      const manager = new SpinnerManager({ color: true, isEnabled: true }, false);
      manager.startSpinner('project1', 'Message');
      manager.stopSpinner('project1', '✓', 'Success message');

      expect(mockSpinner.succeed).toHaveBeenCalledWith('Success message');
    });

    it('should stop spinner with failure symbol', async () => {
      mockSpinner.isSpinning = true;

      const { SpinnerManager } = await import('../../../../src/reporting/internal/spinner-manager.js');

      const manager = new SpinnerManager({ color: true, isEnabled: true }, false);
      manager.startSpinner('project1', 'Message');
      manager.stopSpinner('project1', '✗', 'Failure message');

      expect(mockSpinner.fail).toHaveBeenCalledWith('Failure message');
    });

    it('should do nothing if spinner does not exist', async () => {
      const { SpinnerManager } = await import('../../../../src/reporting/internal/spinner-manager.js');

      const manager = new SpinnerManager({ color: true, isEnabled: true }, false);

      // Should not throw error
      expect(() => {
        manager.stopSpinner('nonexistent');
      }).not.toThrow();
    });

    it('should do nothing in fallback mode', async () => {
      mockOraFactory.mockImplementation(() => {
        throw new Error('Ora initialization failed');
      });

      const { SpinnerManager } = await import('../../../../src/reporting/internal/spinner-manager.js');

      const manager = new SpinnerManager({ color: true, isEnabled: true }, false);

      // Should not throw error
      expect(() => {
        manager.stopSpinner('project1');
      }).not.toThrow();
    });
  });

  describe('clearAllSpinners', () => {
    it('should stop all active spinners and clear the map', async () => {
      mockSpinner.isSpinning = true;

      const { SpinnerManager } = await import('../../../../src/reporting/internal/spinner-manager.js');

      const manager = new SpinnerManager({ color: true, isEnabled: true }, false);
      manager.startSpinner('project1', 'Message 1');
      manager.startSpinner('project2', 'Message 2');

      manager.clearAllSpinners();

      // 1 for constructor test spinner, 2 for the two project spinners
      expect(mockSpinner.stop).toHaveBeenCalledTimes(3);
    });

    it('should not throw error if spinners are already stopped', async () => {
      mockSpinner.isSpinning = false;

      const { SpinnerManager } = await import('../../../../src/reporting/internal/spinner-manager.js');

      const manager = new SpinnerManager({ color: true, isEnabled: true }, false);
      manager.startSpinner('project1', 'Message 1');

      // Should not throw error
      expect(() => {
        manager.clearAllSpinners();
      }).not.toThrow();
    });

    it('should do nothing in fallback mode', async () => {
      mockOraFactory.mockImplementation(() => {
        throw new Error('Ora initialization failed');
      });

      const { SpinnerManager } = await import('../../../../src/reporting/internal/spinner-manager.js');

      const manager = new SpinnerManager({ color: true, isEnabled: true }, false);

      // Should not throw error
      expect(() => {
        manager.clearAllSpinners();
      }).not.toThrow();
    });
  });

  describe('State Management', () => {
    it('should maintain separate spinners for different keys', async () => {
      const { SpinnerManager } = await import('../../../../src/reporting/internal/spinner-manager.js');

      const manager = new SpinnerManager({ color: true, isEnabled: true }, false);

      const spinner1 = manager.startSpinner('project1', 'Message 1');
      const spinner2 = manager.startSpinner('project2', 'Message 2');

      expect(spinner1).toBeDefined();
      expect(spinner2).toBeDefined();
      // 1 for constructor test, 1 for project1, 1 for project2
      expect(mockOraFactory).toHaveBeenCalledTimes(3);
    });

    it('should handle spinner lifecycle correctly', async () => {
      const { SpinnerManager } = await import('../../../../src/reporting/internal/spinner-manager.js');

      const manager = new SpinnerManager({ color: true, isEnabled: true }, false);

      // Start spinner
      mockSpinner.isSpinning = false;
      manager.startSpinner('project1', 'Starting...');
      expect(mockSpinner.start).toHaveBeenCalledWith('Starting...');

      // Update spinner
      mockSpinner.isSpinning = true;
      manager.updateSpinner('project1', 'Processing...');
      expect(mockSpinner.text).toBe('Processing...');

      // Stop spinner
      manager.stopSpinner('project1', '✓', 'Done!');
      expect(mockSpinner.succeed).toHaveBeenCalledWith('Done!');
    });
  });
});
