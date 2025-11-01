/**
 * Ora Package Import Verification Test
 *
 * This test verifies that the ora package is correctly installed and can be imported.
 * Task 1: ora パッケージのインストールと基本セットアップ
 */

import { describe, it, expect } from 'vitest';
import ora from 'ora';

describe('Ora Package Import', () => {
  it('should successfully import ora package', () => {
    // Verify ora is a function (constructor)
    expect(typeof ora).toBe('function');
  });

  it('should create an ora instance with default options', () => {
    // Create a spinner instance
    const spinner = ora('Test spinner');

    // Verify spinner has expected methods
    expect(spinner).toHaveProperty('start');
    expect(spinner).toHaveProperty('stop');
    expect(spinner).toHaveProperty('succeed');
    expect(spinner).toHaveProperty('fail');

    // Verify text property
    expect(spinner).toHaveProperty('text');
    expect(spinner.text).toBe('Test spinner');
  });

  it('should create an ora instance with color configuration', () => {
    // Create a spinner with color disabled
    const spinnerNoColor = ora({ text: 'Test', color: false });
    expect(spinnerNoColor.color).toBe(false);

    // Create a spinner with color enabled (default)
    const spinnerWithColor = ora({ text: 'Test' });
    // color should be a string (like 'cyan') or false
    expect(typeof spinnerWithColor.color === 'string' || spinnerWithColor.color === false).toBe(true);
  });
});
