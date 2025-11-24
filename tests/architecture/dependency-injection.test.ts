/**
 * Architecture Verification Tests - Dependency Injection Pattern
 *
 * Task 4.5: Verify dependency injection pattern is maintained
 * Ensures ProgressReporter, ErrorHandler, PinoLogger follow DI pattern
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('Dependency Injection Pattern Verification', () => {
  const entryTsPath = join(process.cwd(), 'src/cli/entry.ts');
  const entryTsContent = readFileSync(entryTsPath, 'utf-8');

  describe('Dependencies are injected into processProject function', () => {
    it('should have ProgressReporter as parameter in processProject', () => {
      expect(entryTsContent).toMatch(/reporter: ProgressReporter/);
    });

    it('should have ErrorHandler as parameter in processProject', () => {
      expect(entryTsContent).toMatch(/errorHandler: ErrorHandler/);
    });

    it('should have PinoLogger as parameter in processProject', () => {
      expect(entryTsContent).toMatch(/logger: PinoLogger/);
    });
  });

  describe('Dependencies are created at entry point level', () => {
    it('should create PinoLogger in execute function', () => {
      expect(entryTsContent).toMatch(/const logger = new PinoLogger/);
    });

    it('should create ErrorHandler in execute function', () => {
      expect(entryTsContent).toMatch(/const errorHandler = new ErrorHandler/);
    });

    it('should create ProgressReporter in execute function', () => {
      expect(entryTsContent).toMatch(/const reporter = new ProgressReporter/);
    });
  });

  describe('Dependencies are passed down to helper functions', () => {
    it('should pass reporter to processProject calls', () => {
      const processProjectCall = entryTsContent.match(/await processProject\(([\s\S]*?)\)/);
      expect(processProjectCall).toBeDefined();
      if (processProjectCall) {
        expect(processProjectCall[0]).toMatch(/reporter/);
      }
    });

    it('should pass logger to processProject calls', () => {
      const processProjectCall = entryTsContent.match(/await processProject\(([\s\S]*?)\)/);
      expect(processProjectCall).toBeDefined();
      if (processProjectCall) {
        expect(processProjectCall[0]).toMatch(/logger/);
      }
    });

    it('should pass errorHandler to processProject calls', () => {
      const processProjectCall = entryTsContent.match(/await processProject\(([\s\S]*?)\)/);
      expect(processProjectCall).toBeDefined();
      if (processProjectCall) {
        expect(processProjectCall[0]).toMatch(/errorHandler/);
      }
    });
  });
});

describe('Layer Separation Architecture Verification', () => {
  const entryTsPath = join(process.cwd(), 'src/cli/entry.ts');
  const entryTsContent = readFileSync(entryTsPath, 'utf-8');

  describe('Import organization follows layer pattern', () => {
    it('should have external libraries section', () => {
      expect(entryTsContent).toMatch(/\/\/ External libraries/);
    });

    it('should have CLI layer section', () => {
      expect(entryTsContent).toMatch(/\/\/ Internal modules - CLI layer/);
    });

    it('should have GitHub layer section', () => {
      expect(entryTsContent).toMatch(/\/\/ Internal modules - GitHub layer/);
    });

    it('should have FileSystem layer section', () => {
      expect(entryTsContent).toMatch(/\/\/ Internal modules - FileSystem layer/);
    });

    it('should have Reporting layer section', () => {
      expect(entryTsContent).toMatch(/\/\/ Internal modules - Reporting layer/);
    });

    it('should have Tracking layer section', () => {
      expect(entryTsContent).toMatch(/\/\/ Internal modules - Tracking layer/);
    });

    it('should have Config layer section', () => {
      expect(entryTsContent).toMatch(/\/\/ Internal modules - Config layer/);
    });

    it('should have type-only imports section', () => {
      expect(entryTsContent).toMatch(/\/\/ Type-only imports/);
    });
  });

  describe('External libraries come before internal modules', () => {
    it('should import Octokit before internal modules', () => {
      const octokitIndex = entryTsContent.indexOf('import { Octokit }');
      const cliModuleIndex = entryTsContent.indexOf('import { parseArguments }');
      expect(octokitIndex).toBeLessThan(cliModuleIndex);
    });
  });

  describe('Type-only imports come last', () => {
    it('should have type imports after all implementation imports', () => {
      const typeImportIndex = entryTsContent.indexOf('// Type-only imports');
      const lastImplementationImport = entryTsContent.lastIndexOf('from \'../config/merger.js\'');
      expect(typeImportIndex).toBeGreaterThan(lastImplementationImport);
    });
  });
});
