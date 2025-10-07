import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import yaml from 'yaml';

describe('Release Workflow Configuration', () => {
  const workflowPath = join(process.cwd(), '.github/workflows/release.yml');

  it('should have .github/workflows/release.yml file', () => {
    // RED: This test will fail initially because release.yml doesn't exist
    expect(existsSync(workflowPath)).toBe(true);
  });

  it('should have workflow name set to "Release"', () => {
    // RED: This test will fail initially
    const workflowContent = readFileSync(workflowPath, 'utf-8');
    const workflow = yaml.parse(workflowContent);

    expect(workflow.name).toBe('Release');
  });

  it('should trigger on tag push with v*.*.* pattern', () => {
    // RED: This test will fail initially
    const workflowContent = readFileSync(workflowPath, 'utf-8');
    const workflow = yaml.parse(workflowContent);

    expect(workflow.on).toBeDefined();
    expect(workflow.on.push).toBeDefined();
    expect(workflow.on.push.tags).toBeDefined();
    expect(workflow.on.push.tags).toContain('v*.*.*');
  });

  it('should have valid YAML syntax', () => {
    // RED: This test will fail initially
    const workflowContent = readFileSync(workflowPath, 'utf-8');

    // This will throw if YAML is invalid
    expect(() => yaml.parse(workflowContent)).not.toThrow();
  });

  it('should run on ubuntu-latest', () => {
    // RED: This test will fail initially
    const workflowContent = readFileSync(workflowPath, 'utf-8');
    const workflow = yaml.parse(workflowContent);

    expect(workflow.jobs.release).toBeDefined();
    expect(workflow.jobs.release['runs-on']).toBe('ubuntu-latest');
  });

  it('should use Node.js 20', () => {
    // RED: This test will fail initially
    const workflowContent = readFileSync(workflowPath, 'utf-8');
    const workflow = yaml.parse(workflowContent);

    const setupNodeStep = workflow.jobs.release.steps.find(
      (step: any) => step.uses && step.uses.startsWith('actions/setup-node')
    );

    expect(setupNodeStep).toBeDefined();
    expect(setupNodeStep.with['node-version']).toBe('20');
  });

  it('should have checkout step', () => {
    // RED: This test will fail initially
    const workflowContent = readFileSync(workflowPath, 'utf-8');
    const workflow = yaml.parse(workflowContent);

    const checkoutStep = workflow.jobs.release.steps.find(
      (step: any) => step.uses && step.uses.startsWith('actions/checkout')
    );

    expect(checkoutStep).toBeDefined();
    expect(checkoutStep.uses).toContain('actions/checkout@v5');
  });
});
