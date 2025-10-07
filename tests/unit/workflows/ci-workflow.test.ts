import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import yaml from 'yaml';

describe('CI Workflow Configuration', () => {
  const workflowPath = join(process.cwd(), '.github/workflows/ci.yml');

  it('should have .github/workflows directory', () => {
    // RED: This test will fail initially because directory doesn't exist
    const workflowsDir = join(process.cwd(), '.github/workflows');
    expect(existsSync(workflowsDir)).toBe(true);
  });

  it('should have ci.yml workflow file', () => {
    // RED: This test will fail initially because ci.yml doesn't exist
    expect(existsSync(workflowPath)).toBe(true);
  });

  it('should have workflow name set to "CI"', () => {
    // RED: This test will fail initially
    const workflowContent = readFileSync(workflowPath, 'utf-8');
    const workflow = yaml.parse(workflowContent);

    expect(workflow.name).toBe('CI');
  });

  it('should trigger on pull_request to main branch', () => {
    // RED: This test will fail initially
    const workflowContent = readFileSync(workflowPath, 'utf-8');
    const workflow = yaml.parse(workflowContent);

    expect(workflow.on).toBeDefined();
    expect(workflow.on.pull_request).toBeDefined();
    expect(workflow.on.pull_request.branches).toContain('main');
  });

  it('should trigger on push to main branch', () => {
    // RED: This test will fail initially
    const workflowContent = readFileSync(workflowPath, 'utf-8');
    const workflow = yaml.parse(workflowContent);

    expect(workflow.on).toBeDefined();
    expect(workflow.on.push).toBeDefined();
    expect(workflow.on.push.branches).toContain('main');
  });

  it('should have valid YAML syntax', () => {
    // RED: This test will fail initially
    const workflowContent = readFileSync(workflowPath, 'utf-8');

    // This will throw if YAML is invalid
    expect(() => yaml.parse(workflowContent)).not.toThrow();
  });
});
