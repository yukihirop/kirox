/**
 * Individual Field Validation Functions Test
 *
 * Tests for validateRepositoryFormat and validateProjectName functions
 * Task 2.1: 個別フィールドバリデーション関数の追加
 */

import { describe, it, expect } from 'vitest';
import { validateRepositoryFormat, validateProjectName } from '@/cli/validator.js';

describe('validateRepositoryFormat', () => {
  describe('正常系', () => {
    it('owner/repo形式を受け入れる', () => {
      const errors = validateRepositoryFormat('facebook/react');
      expect(errors).toEqual([]);
    });

    it('owner/repo#branch形式を受け入れる', () => {
      const errors = validateRepositoryFormat('facebook/react#main');
      expect(errors).toEqual([]);
    });

    it('ブランチ名にスラッシュを含む場合を受け入れる', () => {
      const errors = validateRepositoryFormat('owner/repo#feature/new-feature');
      expect(errors).toEqual([]);
    });

    it('ハイフン、アンダースコア、ドットを含むリポジトリ名を受け入れる', () => {
      const errors = validateRepositoryFormat('my-org/my_repo.test');
      expect(errors).toEqual([]);
    });

    it('ブランチ名にハイフン、アンダースコア、ドットを含む場合を受け入れる', () => {
      const errors = validateRepositoryFormat('owner/repo#v1.0.0-beta_1');
      expect(errors).toEqual([]);
    });
  });

  describe('異常系', () => {
    it('空文字列を拒否する', () => {
      const errors = validateRepositoryFormat('');
      expect(errors).toHaveLength(1);
      expect(errors[0].field).toBe('repository');
      expect(errors[0].message).toContain('owner/repo');
    });

    it('スラッシュなしの文字列を拒否する', () => {
      const errors = validateRepositoryFormat('facebook');
      expect(errors).toHaveLength(1);
      expect(errors[0].field).toBe('repository');
    });

    it('owner部分が空の場合を拒否する', () => {
      const errors = validateRepositoryFormat('/react');
      expect(errors).toHaveLength(1);
      expect(errors[0].field).toBe('repository');
    });

    it('repo部分が空の場合を拒否する', () => {
      const errors = validateRepositoryFormat('facebook/');
      expect(errors).toHaveLength(1);
      expect(errors[0].field).toBe('repository');
    });

    it('複数のスラッシュを拒否する', () => {
      const errors = validateRepositoryFormat('org/team/repo');
      expect(errors).toHaveLength(1);
      expect(errors[0].field).toBe('repository');
    });

    it('branch部分が空の場合を拒否する', () => {
      const errors = validateRepositoryFormat('owner/repo#');
      expect(errors).toHaveLength(1);
      expect(errors[0].field).toBe('repository');
    });

    it('無効な文字を含む場合を拒否する', () => {
      const errors = validateRepositoryFormat('owner/repo@invalid');
      expect(errors).toHaveLength(1);
      expect(errors[0].field).toBe('repository');
    });

    it('空白を含む場合を拒否する', () => {
      const errors = validateRepositoryFormat('owner/repo name');
      expect(errors).toHaveLength(1);
      expect(errors[0].field).toBe('repository');
    });
  });
});

describe('validateProjectName', () => {
  describe('正常系', () => {
    it('通常のプロジェクト名を受け入れる', () => {
      const errors = validateProjectName('my-project');
      expect(errors).toEqual([]);
    });

    it('ハイフンを含むプロジェクト名を受け入れる', () => {
      const errors = validateProjectName('my-awesome-project');
      expect(errors).toEqual([]);
    });

    it('アンダースコアを含むプロジェクト名を受け入れる', () => {
      const errors = validateProjectName('my_project');
      expect(errors).toEqual([]);
    });

    it('ドットを含むプロジェクト名を受け入れる', () => {
      const errors = validateProjectName('my.project');
      expect(errors).toEqual([]);
    });

    it('数字を含むプロジェクト名を受け入れる', () => {
      const errors = validateProjectName('project123');
      expect(errors).toEqual([]);
    });
  });

  describe('異常系', () => {
    it('空文字列を拒否する', () => {
      const errors = validateProjectName('');
      expect(errors).toHaveLength(1);
      expect(errors[0].field).toBe('project');
      expect(errors[0].message).toContain('empty');
    });

    it('空白のみを拒否する', () => {
      const errors = validateProjectName('   ');
      expect(errors).toHaveLength(1);
      expect(errors[0].field).toBe('project');
      expect(errors[0].message).toContain('empty');
    });

    it('パストラバーサル("..")を拒否する', () => {
      const errors = validateProjectName('../project');
      expect(errors).toHaveLength(1);
      expect(errors[0].field).toBe('project');
      expect(errors[0].message).toContain('..');
    });

    it('中間のパストラバーサルを拒否する', () => {
      const errors = validateProjectName('my/../project');
      expect(errors).toHaveLength(1);
      expect(errors[0].field).toBe('project');
      expect(errors[0].message).toContain('..');
    });

    it('スラッシュを拒否する', () => {
      const errors = validateProjectName('my/project');
      expect(errors).toHaveLength(1);
      expect(errors[0].field).toBe('project');
      expect(errors[0].message).toContain('path separators');
    });

    it('バックスラッシュを拒否する', () => {
      const errors = validateProjectName('my\\project');
      expect(errors).toHaveLength(1);
      expect(errors[0].field).toBe('project');
      expect(errors[0].message).toContain('path separators');
    });
  });

  describe('境界値テスト', () => {
    it('単一文字のプロジェクト名を受け入れる', () => {
      const errors = validateProjectName('a');
      expect(errors).toEqual([]);
    });

    it('非常に長いプロジェクト名を受け入れる', () => {
      const longName = 'a'.repeat(255);
      const errors = validateProjectName(longName);
      expect(errors).toEqual([]);
    });
  });
});
