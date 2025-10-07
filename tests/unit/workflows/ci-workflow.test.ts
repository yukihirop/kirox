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

  describe('Matrix Strategy', () => {
    it('should have matrix strategy configured', () => {
      // RED: This test will fail initially because matrix is not yet configured
      const workflowContent = readFileSync(workflowPath, 'utf-8');
      const workflow = yaml.parse(workflowContent);

      expect(workflow.jobs.test.strategy).toBeDefined();
      expect(workflow.jobs.test.strategy.matrix).toBeDefined();
    });

    it('should include Node.js 18.x in matrix', () => {
      // RED: This test will fail initially
      const workflowContent = readFileSync(workflowPath, 'utf-8');
      const workflow = yaml.parse(workflowContent);

      const nodeVersions = workflow.jobs.test.strategy.matrix['node-version'];
      expect(nodeVersions).toContain('18.x');
    });

    it('should include Node.js 20.x in matrix', () => {
      // RED: This test will fail initially
      const workflowContent = readFileSync(workflowPath, 'utf-8');
      const workflow = yaml.parse(workflowContent);

      const nodeVersions = workflow.jobs.test.strategy.matrix['node-version'];
      expect(nodeVersions).toContain('20.x');
    });

    it('should include Node.js 22.x in matrix', () => {
      // RED: This test will fail initially
      const workflowContent = readFileSync(workflowPath, 'utf-8');
      const workflow = yaml.parse(workflowContent);

      const nodeVersions = workflow.jobs.test.strategy.matrix['node-version'];
      expect(nodeVersions).toContain('22.x');
    });

    it('should have exactly 3 Node.js versions', () => {
      // RED: This test will fail initially
      const workflowContent = readFileSync(workflowPath, 'utf-8');
      const workflow = yaml.parse(workflowContent);

      const nodeVersions = workflow.jobs.test.strategy.matrix['node-version'];
      expect(nodeVersions).toHaveLength(3);
    });

    it('should run on ubuntu-latest', () => {
      // This test should already pass, verifying existing configuration
      const workflowContent = readFileSync(workflowPath, 'utf-8');
      const workflow = yaml.parse(workflowContent);

      expect(workflow.jobs.test['runs-on']).toBe('ubuntu-latest');
    });

    it('should use matrix node-version in setup-node step', () => {
      // RED: This test will fail initially because matrix variable is not used
      const workflowContent = readFileSync(workflowPath, 'utf-8');
      const workflow = yaml.parse(workflowContent);

      const setupNodeStep = workflow.jobs.test.steps.find(
        (step: any) => step.uses && step.uses.startsWith('actions/setup-node')
      );

      expect(setupNodeStep).toBeDefined();
      expect(setupNodeStep.with['node-version']).toBe('${{ matrix.node-version }}');
    });
  });
});
