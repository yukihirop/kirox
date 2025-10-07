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

  describe('CI Validation Steps', () => {
    it('should have npm ci installation step', () => {
      // RED: This test will fail initially
      const workflowContent = readFileSync(workflowPath, 'utf-8');
      const workflow = yaml.parse(workflowContent);

      const installStep = workflow.jobs.release.steps.find(
        (step: any) => step.run && step.run.includes('npm ci')
      );

      expect(installStep).toBeDefined();
      expect(installStep.run).toBe('npm ci');
    });

    it('should have TypeScript type check step', () => {
      // RED: This test will fail initially
      const workflowContent = readFileSync(workflowPath, 'utf-8');
      const workflow = yaml.parse(workflowContent);

      const typeCheckStep = workflow.jobs.release.steps.find(
        (step: any) => step.run && step.run.includes('type-check')
      );

      expect(typeCheckStep).toBeDefined();
      expect(typeCheckStep.run).toBe('npm run type-check');
    });

    it('should have ESLint step', () => {
      // RED: This test will fail initially
      const workflowContent = readFileSync(workflowPath, 'utf-8');
      const workflow = yaml.parse(workflowContent);

      const lintStep = workflow.jobs.release.steps.find(
        (step: any) => step.run && step.run.includes('lint')
      );

      expect(lintStep).toBeDefined();
      expect(lintStep.run).toBe('npm run lint');
    });

    it('should have build step', () => {
      // RED: This test will fail initially
      const workflowContent = readFileSync(workflowPath, 'utf-8');
      const workflow = yaml.parse(workflowContent);

      const buildStep = workflow.jobs.release.steps.find(
        (step: any) => step.run && step.run.includes('build')
      );

      expect(buildStep).toBeDefined();
      expect(buildStep.run).toBe('npm run build');
    });

    it('should have test step', () => {
      // RED: This test will fail initially
      const workflowContent = readFileSync(workflowPath, 'utf-8');
      const workflow = yaml.parse(workflowContent);

      const testStep = workflow.jobs.release.steps.find(
        (step: any) => step.run && step.run === 'npm test'
      );

      expect(testStep).toBeDefined();
    });

    it('should run validation steps in correct order', () => {
      // RED: This test will fail initially
      const workflowContent = readFileSync(workflowPath, 'utf-8');
      const workflow = yaml.parse(workflowContent);

      const steps = workflow.jobs.release.steps;
      const stepNames = steps.map((step: any) => step.run || step.name);

      // Find indices of validation steps
      const typeCheckIndex = stepNames.findIndex((name: string) =>
        name && name.includes('type-check')
      );
      const lintIndex = stepNames.findIndex((name: string) =>
        name && name.includes('lint')
      );
      const buildIndex = stepNames.findIndex((name: string) =>
        name && name.includes('build')
      );
      const testIndex = stepNames.findIndex((name: string) =>
        name && name === 'npm test'
      );

      // Verify all steps exist
      expect(typeCheckIndex).toBeGreaterThan(-1);
      expect(lintIndex).toBeGreaterThan(-1);
      expect(buildIndex).toBeGreaterThan(-1);
      expect(testIndex).toBeGreaterThan(-1);

      // Verify order: type-check -> lint -> build -> test
      expect(typeCheckIndex).toBeLessThan(lintIndex);
      expect(lintIndex).toBeLessThan(buildIndex);
      expect(buildIndex).toBeLessThan(testIndex);
    });
  });

  describe('NPM Publish Step', () => {
    it('should have setup-node step with registry-url configured', () => {
      // RED: This test will fail initially
      const workflowContent = readFileSync(workflowPath, 'utf-8');
      const workflow = yaml.parse(workflowContent);

      const setupNodeStep = workflow.jobs.release.steps.find(
        (step: any) => step.uses && step.uses.startsWith('actions/setup-node')
      );

      expect(setupNodeStep).toBeDefined();
      expect(setupNodeStep.with['registry-url']).toBe('https://registry.npmjs.org');
    });

    it('should have npm publish step', () => {
      // RED: This test will fail initially
      const workflowContent = readFileSync(workflowPath, 'utf-8');
      const workflow = yaml.parse(workflowContent);

      const publishStep = workflow.jobs.release.steps.find(
        (step: any) => step.run && step.run.includes('npm publish')
      );

      expect(publishStep).toBeDefined();
      expect(publishStep.run).toBe('npm publish');
    });

    it('should configure NODE_AUTH_TOKEN from secrets', () => {
      // RED: This test will fail initially
      const workflowContent = readFileSync(workflowPath, 'utf-8');
      const workflow = yaml.parse(workflowContent);

      const publishStep = workflow.jobs.release.steps.find(
        (step: any) => step.run && step.run.includes('npm publish')
      );

      expect(publishStep).toBeDefined();
      expect(publishStep.env).toBeDefined();
      expect(publishStep.env.NODE_AUTH_TOKEN).toBe('${{ secrets.NPM_TOKEN }}');
    });

    it('should run publish step after all CI validation steps', () => {
      // RED: This test will fail initially
      const workflowContent = readFileSync(workflowPath, 'utf-8');
      const workflow = yaml.parse(workflowContent);

      const steps = workflow.jobs.release.steps;
      const stepNames = steps.map((step: any) => step.run || step.name);

      const testIndex = stepNames.findIndex((name: string) =>
        name && name === 'npm test'
      );
      const publishIndex = stepNames.findIndex((name: string) =>
        name && name.includes('npm publish')
      );

      expect(testIndex).toBeGreaterThan(-1);
      expect(publishIndex).toBeGreaterThan(-1);
      expect(publishIndex).toBeGreaterThan(testIndex);
    });
  });

  describe('GitHub Release Creation', () => {
    it('should have GitHub release creation step', () => {
      // RED: This test will fail initially
      const workflowContent = readFileSync(workflowPath, 'utf-8');
      const workflow = yaml.parse(workflowContent);

      const releaseStep = workflow.jobs.release.steps.find(
        (step: any) =>
          step.uses && step.uses.includes('softprops/action-gh-release')
      );

      expect(releaseStep).toBeDefined();
    });

    it('should use softprops/action-gh-release@v2', () => {
      // RED: This test will fail initially
      const workflowContent = readFileSync(workflowPath, 'utf-8');
      const workflow = yaml.parse(workflowContent);

      const releaseStep = workflow.jobs.release.steps.find(
        (step: any) =>
          step.uses && step.uses.includes('softprops/action-gh-release')
      );

      expect(releaseStep).toBeDefined();
      expect(releaseStep.uses).toContain('softprops/action-gh-release@v2');
    });

    it('should configure generate_release_notes to true', () => {
      // RED: This test will fail initially
      const workflowContent = readFileSync(workflowPath, 'utf-8');
      const workflow = yaml.parse(workflowContent);

      const releaseStep = workflow.jobs.release.steps.find(
        (step: any) =>
          step.uses && step.uses.includes('softprops/action-gh-release')
      );

      expect(releaseStep).toBeDefined();
      expect(releaseStep.with).toBeDefined();
      expect(releaseStep.with.generate_release_notes).toBe(true);
    });

    it('should run release step after npm publish', () => {
      // RED: This test will fail initially
      const workflowContent = readFileSync(workflowPath, 'utf-8');
      const workflow = yaml.parse(workflowContent);

      const steps = workflow.jobs.release.steps;
      const stepNames = steps.map((step: any) => step.uses || step.run || step.name);

      const publishIndex = stepNames.findIndex((name: string) =>
        name && name.includes('npm publish')
      );
      const releaseIndex = stepNames.findIndex((name: string) =>
        name && name.includes('softprops/action-gh-release')
      );

      expect(publishIndex).toBeGreaterThan(-1);
      expect(releaseIndex).toBeGreaterThan(-1);
      expect(releaseIndex).toBeGreaterThan(publishIndex);
    });
  });

  describe('Workflow Permissions', () => {
    it('should have permissions defined at workflow level', () => {
      // RED: This test will fail initially
      const workflowContent = readFileSync(workflowPath, 'utf-8');
      const workflow = yaml.parse(workflowContent);

      expect(workflow.permissions).toBeDefined();
    });

    it('should have contents: write permission', () => {
      // RED: This test will fail initially
      const workflowContent = readFileSync(workflowPath, 'utf-8');
      const workflow = yaml.parse(workflowContent);

      expect(workflow.permissions).toBeDefined();
      expect(workflow.permissions.contents).toBe('write');
    });

    it('should have id-token: write permission', () => {
      // RED: This test will fail initially
      const workflowContent = readFileSync(workflowPath, 'utf-8');
      const workflow = yaml.parse(workflowContent);

      expect(workflow.permissions).toBeDefined();
      expect(workflow.permissions['id-token']).toBe('write');
    });

    it('should only have minimal permissions (contents and id-token)', () => {
      // RED: This test will fail initially
      const workflowContent = readFileSync(workflowPath, 'utf-8');
      const workflow = yaml.parse(workflowContent);

      expect(workflow.permissions).toBeDefined();
      const permissionKeys = Object.keys(workflow.permissions);
      expect(permissionKeys).toHaveLength(2);
      expect(permissionKeys).toContain('contents');
      expect(permissionKeys).toContain('id-token');
    });
  });
});
