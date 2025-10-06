/**
 * Update Filter Unit Tests
 */

import { describe, it, expect } from 'vitest';
import { filterUpdatableFiles, type FilterOptions } from '../../../src/tracking/update-filter.js';
import { UpdateStatus, type UpdateCheckResult } from '../../../src/tracking/update-checker.js';

describe('UpdateFilter', () => {
  describe('filterUpdatableFiles - 基本動作', () => {
    it('REMOTE_UPDATEDステータスのファイルを抽出する', () => {
      const results: UpdateCheckResult[] = [
        {
          status: UpdateStatus.REMOTE_UPDATED,
          recordedSha: 'old-sha',
          remoteSha: 'new-sha',
          recordedHash: 'hash123',
          currentHash: 'hash123',
          hasLocalEdit: false,
          hasRemoteUpdate: true,
        },
        {
          status: UpdateStatus.UP_TO_DATE,
          recordedSha: 'sha456',
          remoteSha: 'sha456',
          recordedHash: 'hash456',
          currentHash: 'hash456',
          hasLocalEdit: false,
          hasRemoteUpdate: false,
        },
      ];

      const filtered = filterUpdatableFiles(results);

      expect(filtered.updatable).toHaveLength(1);
      expect(filtered.updatable[0].status).toBe(UpdateStatus.REMOTE_UPDATED);
      expect(filtered.skipped).toHaveLength(1);
      expect(filtered.skipped[0].result.status).toBe(UpdateStatus.UP_TO_DATE);
    });

    it('複数のREMOTE_UPDATEDファイルを抽出する', () => {
      const results: UpdateCheckResult[] = [
        {
          status: UpdateStatus.REMOTE_UPDATED,
          recordedSha: 'old-sha-1',
          remoteSha: 'new-sha-1',
          recordedHash: 'hash1',
          currentHash: 'hash1',
          hasLocalEdit: false,
          hasRemoteUpdate: true,
        },
        {
          status: UpdateStatus.REMOTE_UPDATED,
          recordedSha: 'old-sha-2',
          remoteSha: 'new-sha-2',
          recordedHash: 'hash2',
          currentHash: 'hash2',
          hasLocalEdit: false,
          hasRemoteUpdate: true,
        },
        {
          status: UpdateStatus.LOCAL_EDITED,
          recordedSha: 'sha3',
          remoteSha: 'sha3',
          recordedHash: 'hash3',
          currentHash: 'hash3-modified',
          hasLocalEdit: true,
          hasRemoteUpdate: false,
        },
      ];

      const filtered = filterUpdatableFiles(results);

      expect(filtered.updatable).toHaveLength(2);
      expect(filtered.skipped).toHaveLength(1);
    });
  });

  describe('filterUpdatableFiles - スキップ判定', () => {
    it('UP_TO_DATEステータスのファイルをスキップする', () => {
      const results: UpdateCheckResult[] = [
        {
          status: UpdateStatus.UP_TO_DATE,
          recordedSha: 'sha123',
          remoteSha: 'sha123',
          recordedHash: 'hash123',
          currentHash: 'hash123',
          hasLocalEdit: false,
          hasRemoteUpdate: false,
        },
      ];

      const filtered = filterUpdatableFiles(results);

      expect(filtered.updatable).toHaveLength(0);
      expect(filtered.skipped).toHaveLength(1);
      expect(filtered.skipped[0].reason).toBe('up-to-date');
    });

    it('LOCAL_EDITEDステータスのファイルをスキップする', () => {
      const results: UpdateCheckResult[] = [
        {
          status: UpdateStatus.LOCAL_EDITED,
          recordedSha: 'sha123',
          remoteSha: 'sha123',
          recordedHash: 'hash123',
          currentHash: 'hash456',
          hasLocalEdit: true,
          hasRemoteUpdate: false,
        },
      ];

      const filtered = filterUpdatableFiles(results);

      expect(filtered.updatable).toHaveLength(0);
      expect(filtered.skipped).toHaveLength(1);
      expect(filtered.skipped[0].reason).toBe('local-edit');
    });

    it('CONFLICTステータスのファイルをスキップする', () => {
      const results: UpdateCheckResult[] = [
        {
          status: UpdateStatus.CONFLICT,
          recordedSha: 'old-sha',
          remoteSha: 'new-sha',
          recordedHash: 'hash123',
          currentHash: 'hash456',
          hasLocalEdit: true,
          hasRemoteUpdate: true,
        },
      ];

      const filtered = filterUpdatableFiles(results);

      expect(filtered.updatable).toHaveLength(0);
      expect(filtered.skipped).toHaveLength(1);
      expect(filtered.skipped[0].reason).toBe('conflict');
    });

    it('LOCAL_DELETEDステータスのファイルをスキップする', () => {
      const results: UpdateCheckResult[] = [
        {
          status: UpdateStatus.LOCAL_DELETED,
          recordedSha: 'sha123',
          remoteSha: 'sha123',
          recordedHash: 'hash123',
          hasLocalEdit: true,
          hasRemoteUpdate: false,
        },
      ];

      const filtered = filterUpdatableFiles(results);

      expect(filtered.updatable).toHaveLength(0);
      expect(filtered.skipped).toHaveLength(1);
      expect(filtered.skipped[0].reason).toBe('local-deleted');
    });

    it('REMOTE_DELETEDステータスのファイルをスキップする', () => {
      const results: UpdateCheckResult[] = [
        {
          status: UpdateStatus.REMOTE_DELETED,
          recordedSha: 'sha123',
          recordedHash: 'hash123',
          currentHash: 'hash123',
          hasLocalEdit: false,
          hasRemoteUpdate: true,
        },
      ];

      const filtered = filterUpdatableFiles(results);

      expect(filtered.updatable).toHaveLength(0);
      expect(filtered.skipped).toHaveLength(1);
      expect(filtered.skipped[0].reason).toBe('remote-deleted');
    });

    it('ERRORステータスのファイルをスキップする', () => {
      const results: UpdateCheckResult[] = [
        {
          status: UpdateStatus.ERROR,
          recordedSha: 'sha123',
          recordedHash: 'hash123',
          hasLocalEdit: false,
          hasRemoteUpdate: false,
          error: 'Network error',
        },
      ];

      const filtered = filterUpdatableFiles(results);

      expect(filtered.updatable).toHaveLength(0);
      expect(filtered.skipped).toHaveLength(1);
      expect(filtered.skipped[0].reason).toBe('error');
    });
  });

  describe('filterUpdatableFiles - forceオプション', () => {
    it('forceオプションなしでLOCAL_EDITEDファイルをスキップする', () => {
      const results: UpdateCheckResult[] = [
        {
          status: UpdateStatus.LOCAL_EDITED,
          recordedSha: 'sha123',
          remoteSha: 'sha123',
          recordedHash: 'hash123',
          currentHash: 'hash456',
          hasLocalEdit: true,
          hasRemoteUpdate: false,
        },
      ];

      const filtered = filterUpdatableFiles(results);

      expect(filtered.updatable).toHaveLength(0);
      expect(filtered.skipped).toHaveLength(1);
      expect(filtered.skipped[0].reason).toBe('local-edit');
    });

    it('forceオプション指定時にCONFLICTファイルを更新可能にする', () => {
      const results: UpdateCheckResult[] = [
        {
          status: UpdateStatus.CONFLICT,
          recordedSha: 'old-sha',
          remoteSha: 'new-sha',
          recordedHash: 'hash123',
          currentHash: 'hash456',
          hasLocalEdit: true,
          hasRemoteUpdate: true,
        },
      ];

      const options: FilterOptions = { force: true };
      const filtered = filterUpdatableFiles(results, options);

      expect(filtered.updatable).toHaveLength(1);
      expect(filtered.updatable[0].status).toBe(UpdateStatus.CONFLICT);
      expect(filtered.skipped).toHaveLength(0);
    });

    it('forceオプション指定時でもUP_TO_DATEファイルはスキップする', () => {
      const results: UpdateCheckResult[] = [
        {
          status: UpdateStatus.UP_TO_DATE,
          recordedSha: 'sha123',
          remoteSha: 'sha123',
          recordedHash: 'hash123',
          currentHash: 'hash123',
          hasLocalEdit: false,
          hasRemoteUpdate: false,
        },
      ];

      const options: FilterOptions = { force: true };
      const filtered = filterUpdatableFiles(results, options);

      expect(filtered.updatable).toHaveLength(0);
      expect(filtered.skipped).toHaveLength(1);
      expect(filtered.skipped[0].reason).toBe('up-to-date');
    });

    it('forceオプション指定時でもERRORファイルはスキップする', () => {
      const results: UpdateCheckResult[] = [
        {
          status: UpdateStatus.ERROR,
          recordedSha: 'sha123',
          recordedHash: 'hash123',
          hasLocalEdit: false,
          hasRemoteUpdate: false,
          error: 'Network error',
        },
      ];

      const options: FilterOptions = { force: true };
      const filtered = filterUpdatableFiles(results, options);

      expect(filtered.updatable).toHaveLength(0);
      expect(filtered.skipped).toHaveLength(1);
      expect(filtered.skipped[0].reason).toBe('error');
    });

    it('forceオプション指定時でもLOCAL_DELETEDファイルはスキップする', () => {
      const results: UpdateCheckResult[] = [
        {
          status: UpdateStatus.LOCAL_DELETED,
          recordedSha: 'sha123',
          remoteSha: 'sha123',
          recordedHash: 'hash123',
          hasLocalEdit: true,
          hasRemoteUpdate: false,
        },
      ];

      const options: FilterOptions = { force: true };
      const filtered = filterUpdatableFiles(results, options);

      expect(filtered.updatable).toHaveLength(0);
      expect(filtered.skipped).toHaveLength(1);
      expect(filtered.skipped[0].reason).toBe('local-deleted');
    });
  });

  describe('filterUpdatableFiles - 複合パターン', () => {
    it('複数のステータスが混在する場合に正しく分類する', () => {
      const results: UpdateCheckResult[] = [
        {
          status: UpdateStatus.REMOTE_UPDATED,
          recordedSha: 'old-sha-1',
          remoteSha: 'new-sha-1',
          recordedHash: 'hash1',
          currentHash: 'hash1',
          hasLocalEdit: false,
          hasRemoteUpdate: true,
        },
        {
          status: UpdateStatus.UP_TO_DATE,
          recordedSha: 'sha2',
          remoteSha: 'sha2',
          recordedHash: 'hash2',
          currentHash: 'hash2',
          hasLocalEdit: false,
          hasRemoteUpdate: false,
        },
        {
          status: UpdateStatus.LOCAL_EDITED,
          recordedSha: 'sha3',
          remoteSha: 'sha3',
          recordedHash: 'hash3',
          currentHash: 'hash3-modified',
          hasLocalEdit: true,
          hasRemoteUpdate: false,
        },
        {
          status: UpdateStatus.CONFLICT,
          recordedSha: 'old-sha-4',
          remoteSha: 'new-sha-4',
          recordedHash: 'hash4',
          currentHash: 'hash4-modified',
          hasLocalEdit: true,
          hasRemoteUpdate: true,
        },
        {
          status: UpdateStatus.ERROR,
          recordedSha: 'sha5',
          recordedHash: 'hash5',
          hasLocalEdit: false,
          hasRemoteUpdate: false,
          error: 'Network error',
        },
      ];

      const filtered = filterUpdatableFiles(results);

      expect(filtered.updatable).toHaveLength(1);
      expect(filtered.updatable[0].status).toBe(UpdateStatus.REMOTE_UPDATED);
      expect(filtered.skipped).toHaveLength(4);

      // スキップ理由の確認
      const skipReasons = filtered.skipped.map((s) => s.reason);
      expect(skipReasons).toContain('up-to-date');
      expect(skipReasons).toContain('local-edit');
      expect(skipReasons).toContain('conflict');
      expect(skipReasons).toContain('error');
    });

    it('forceオプション指定時にCONFLICTのみを更新可能にする', () => {
      const results: UpdateCheckResult[] = [
        {
          status: UpdateStatus.REMOTE_UPDATED,
          recordedSha: 'old-sha-1',
          remoteSha: 'new-sha-1',
          recordedHash: 'hash1',
          currentHash: 'hash1',
          hasLocalEdit: false,
          hasRemoteUpdate: true,
        },
        {
          status: UpdateStatus.CONFLICT,
          recordedSha: 'old-sha-2',
          remoteSha: 'new-sha-2',
          recordedHash: 'hash2',
          currentHash: 'hash2-modified',
          hasLocalEdit: true,
          hasRemoteUpdate: true,
        },
        {
          status: UpdateStatus.UP_TO_DATE,
          recordedSha: 'sha3',
          remoteSha: 'sha3',
          recordedHash: 'hash3',
          currentHash: 'hash3',
          hasLocalEdit: false,
          hasRemoteUpdate: false,
        },
      ];

      const options: FilterOptions = { force: true };
      const filtered = filterUpdatableFiles(results, options);

      expect(filtered.updatable).toHaveLength(2);
      expect(filtered.updatable[0].status).toBe(UpdateStatus.REMOTE_UPDATED);
      expect(filtered.updatable[1].status).toBe(UpdateStatus.CONFLICT);
      expect(filtered.skipped).toHaveLength(1);
      expect(filtered.skipped[0].reason).toBe('up-to-date');
    });
  });

  describe('filterUpdatableFiles - エッジケース', () => {
    it('空の配列を処理する', () => {
      const results: UpdateCheckResult[] = [];

      const filtered = filterUpdatableFiles(results);

      expect(filtered.updatable).toHaveLength(0);
      expect(filtered.skipped).toHaveLength(0);
    });

    it('全てのファイルがスキップされる場合', () => {
      const results: UpdateCheckResult[] = [
        {
          status: UpdateStatus.UP_TO_DATE,
          recordedSha: 'sha1',
          remoteSha: 'sha1',
          recordedHash: 'hash1',
          currentHash: 'hash1',
          hasLocalEdit: false,
          hasRemoteUpdate: false,
        },
        {
          status: UpdateStatus.LOCAL_EDITED,
          recordedSha: 'sha2',
          remoteSha: 'sha2',
          recordedHash: 'hash2',
          currentHash: 'hash2-modified',
          hasLocalEdit: true,
          hasRemoteUpdate: false,
        },
      ];

      const filtered = filterUpdatableFiles(results);

      expect(filtered.updatable).toHaveLength(0);
      expect(filtered.skipped).toHaveLength(2);
    });

    it('全てのファイルが更新可能な場合', () => {
      const results: UpdateCheckResult[] = [
        {
          status: UpdateStatus.REMOTE_UPDATED,
          recordedSha: 'old-sha-1',
          remoteSha: 'new-sha-1',
          recordedHash: 'hash1',
          currentHash: 'hash1',
          hasLocalEdit: false,
          hasRemoteUpdate: true,
        },
        {
          status: UpdateStatus.REMOTE_UPDATED,
          recordedSha: 'old-sha-2',
          remoteSha: 'new-sha-2',
          recordedHash: 'hash2',
          currentHash: 'hash2',
          hasLocalEdit: false,
          hasRemoteUpdate: true,
        },
      ];

      const filtered = filterUpdatableFiles(results);

      expect(filtered.updatable).toHaveLength(2);
      expect(filtered.skipped).toHaveLength(0);
    });
  });

  describe('FilterResult構造', () => {
    it('正しい構造を持つ', () => {
      const results: UpdateCheckResult[] = [
        {
          status: UpdateStatus.REMOTE_UPDATED,
          recordedSha: 'old-sha',
          remoteSha: 'new-sha',
          recordedHash: 'hash123',
          currentHash: 'hash123',
          hasLocalEdit: false,
          hasRemoteUpdate: true,
        },
        {
          status: UpdateStatus.UP_TO_DATE,
          recordedSha: 'sha456',
          remoteSha: 'sha456',
          recordedHash: 'hash456',
          currentHash: 'hash456',
          hasLocalEdit: false,
          hasRemoteUpdate: false,
        },
      ];

      const filtered = filterUpdatableFiles(results);

      expect(filtered).toHaveProperty('updatable');
      expect(filtered).toHaveProperty('skipped');
      expect(Array.isArray(filtered.updatable)).toBe(true);
      expect(Array.isArray(filtered.skipped)).toBe(true);
    });

    it('スキップ情報にreasonフィールドを含む', () => {
      const results: UpdateCheckResult[] = [
        {
          status: UpdateStatus.UP_TO_DATE,
          recordedSha: 'sha123',
          remoteSha: 'sha123',
          recordedHash: 'hash123',
          currentHash: 'hash123',
          hasLocalEdit: false,
          hasRemoteUpdate: false,
        },
      ];

      const filtered = filterUpdatableFiles(results);

      expect(filtered.skipped).toHaveLength(1);
      expect(filtered.skipped[0]).toHaveProperty('result');
      expect(filtered.skipped[0]).toHaveProperty('reason');
      expect(filtered.skipped[0].reason).toBe('up-to-date');
    });
  });
});
