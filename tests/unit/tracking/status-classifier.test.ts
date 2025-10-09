/**
 * Status Classifier Unit Tests
 */

import { describe, it, expect } from 'vitest';
import {
  isUpToDate,
  isUpdatable,
  hasConflict,
  isLocalEditedOnly,
  getStatusMessage,
  canAutoUpdate,
  FileStatusInfo,
} from '../../../src/tracking/status-classifier.js';
import { UpdateStatus } from '../../../src/tracking/update-checker.js';

describe('StatusClassifier', () => {
  describe('isUpToDate', () => {
    it('UP_TO_DATEステータスの場合にtrueを返す', () => {
      const statusInfo: FileStatusInfo = {
        path: 'file.md',
        status: UpdateStatus.UP_TO_DATE,
        hasLocalEdit: false,
        hasRemoteUpdate: false,
      };

      expect(isUpToDate(statusInfo)).toBe(true);
    });

    it('他のステータスの場合にfalseを返す', () => {
      const statusInfo: FileStatusInfo = {
        path: 'file.md',
        status: UpdateStatus.REMOTE_UPDATED,
        hasLocalEdit: false,
        hasRemoteUpdate: true,
      };

      expect(isUpToDate(statusInfo)).toBe(false);
    });
  });

  describe('isUpdatable', () => {
    it('REMOTE_UPDATEDステータスの場合にtrueを返す', () => {
      const statusInfo: FileStatusInfo = {
        path: 'file.md',
        status: UpdateStatus.REMOTE_UPDATED,
        hasLocalEdit: false,
        hasRemoteUpdate: true,
      };

      expect(isUpdatable(statusInfo)).toBe(true);
    });

    it('ローカル編集がある場合にfalseを返す', () => {
      const statusInfo: FileStatusInfo = {
        path: 'file.md',
        status: UpdateStatus.CONFLICT,
        hasLocalEdit: true,
        hasRemoteUpdate: true,
      };

      expect(isUpdatable(statusInfo)).toBe(false);
    });

    it('リモート更新がない場合にfalseを返す', () => {
      const statusInfo: FileStatusInfo = {
        path: 'file.md',
        status: UpdateStatus.UP_TO_DATE,
        hasLocalEdit: false,
        hasRemoteUpdate: false,
      };

      expect(isUpdatable(statusInfo)).toBe(false);
    });
  });

  describe('hasConflict', () => {
    it('CONFLICTステータスの場合にtrueを返す', () => {
      const statusInfo: FileStatusInfo = {
        path: 'file.md',
        status: UpdateStatus.CONFLICT,
        hasLocalEdit: true,
        hasRemoteUpdate: true,
      };

      expect(hasConflict(statusInfo)).toBe(true);
    });

    it('リモート削除とローカル編集の場合にtrueを返す', () => {
      const statusInfo: FileStatusInfo = {
        path: 'file.md',
        status: UpdateStatus.REMOTE_DELETED,
        hasLocalEdit: true,
        hasRemoteUpdate: true,
      };

      expect(hasConflict(statusInfo)).toBe(true);
    });

    it('競合がない場合にfalseを返す', () => {
      const statusInfo: FileStatusInfo = {
        path: 'file.md',
        status: UpdateStatus.REMOTE_UPDATED,
        hasLocalEdit: false,
        hasRemoteUpdate: true,
      };

      expect(hasConflict(statusInfo)).toBe(false);
    });
  });

  describe('isLocalEditedOnly', () => {
    it('LOCAL_EDITEDステータスの場合にtrueを返す', () => {
      const statusInfo: FileStatusInfo = {
        path: 'file.md',
        status: UpdateStatus.LOCAL_EDITED,
        hasLocalEdit: true,
        hasRemoteUpdate: false,
      };

      expect(isLocalEditedOnly(statusInfo)).toBe(true);
    });

    it('リモート更新もある場合にfalseを返す', () => {
      const statusInfo: FileStatusInfo = {
        path: 'file.md',
        status: UpdateStatus.CONFLICT,
        hasLocalEdit: true,
        hasRemoteUpdate: true,
      };

      expect(isLocalEditedOnly(statusInfo)).toBe(false);
    });

    it('ローカル編集がない場合にfalseを返す', () => {
      const statusInfo: FileStatusInfo = {
        path: 'file.md',
        status: UpdateStatus.UP_TO_DATE,
        hasLocalEdit: false,
        hasRemoteUpdate: false,
      };

      expect(isLocalEditedOnly(statusInfo)).toBe(false);
    });
  });

  describe('getStatusMessage', () => {
    it('UP_TO_DATEの場合に適切なメッセージを返す', () => {
      const statusInfo: FileStatusInfo = {
        path: 'file.md',
        status: UpdateStatus.UP_TO_DATE,
        hasLocalEdit: false,
        hasRemoteUpdate: false,
      };

      const message = getStatusMessage(statusInfo);
      expect(message).toContain('Up to date');
    });

    it('REMOTE_UPDATEDの場合に適切なメッセージを返す', () => {
      const statusInfo: FileStatusInfo = {
        path: 'file.md',
        status: UpdateStatus.REMOTE_UPDATED,
        hasLocalEdit: false,
        hasRemoteUpdate: true,
      };

      const message = getStatusMessage(statusInfo);
      expect(message).toContain('Update available');
    });

    it('LOCAL_EDITEDの場合に適切なメッセージを返す', () => {
      const statusInfo: FileStatusInfo = {
        path: 'file.md',
        status: UpdateStatus.LOCAL_EDITED,
        hasLocalEdit: true,
        hasRemoteUpdate: false,
      };

      const message = getStatusMessage(statusInfo);
      expect(message).toContain('Local edits');
    });

    it('CONFLICTの場合に適切なメッセージを返す', () => {
      const statusInfo: FileStatusInfo = {
        path: 'file.md',
        status: UpdateStatus.CONFLICT,
        hasLocalEdit: true,
        hasRemoteUpdate: true,
      };

      const message = getStatusMessage(statusInfo);
      expect(message).toContain('Conflict');
    });

    it('LOCAL_DELETEDの場合に適切なメッセージを返す', () => {
      const statusInfo: FileStatusInfo = {
        path: 'file.md',
        status: UpdateStatus.LOCAL_DELETED,
        hasLocalEdit: true,
        hasRemoteUpdate: false,
      };

      const message = getStatusMessage(statusInfo);
      expect(message).toContain('Deleted locally');
    });

    it('REMOTE_DELETEDの場合に適切なメッセージを返す', () => {
      const statusInfo: FileStatusInfo = {
        path: 'file.md',
        status: UpdateStatus.REMOTE_DELETED,
        hasLocalEdit: false,
        hasRemoteUpdate: true,
      };

      const message = getStatusMessage(statusInfo);
      expect(message).toContain('Deleted remotely');
    });

    it('ERRORの場合に適切なメッセージを返す', () => {
      const statusInfo: FileStatusInfo = {
        path: 'file.md',
        status: UpdateStatus.ERROR,
        hasLocalEdit: false,
        hasRemoteUpdate: false,
        error: 'Network error',
      };

      const message = getStatusMessage(statusInfo);
      expect(message).toContain('Error');
      expect(message).toContain('Network error');
    });
  });

  describe('canAutoUpdate', () => {
    it('REMOTE_UPDATEDの場合にtrueを返す', () => {
      const statusInfo: FileStatusInfo = {
        path: 'file.md',
        status: UpdateStatus.REMOTE_UPDATED,
        hasLocalEdit: false,
        hasRemoteUpdate: true,
      };

      expect(canAutoUpdate(statusInfo)).toBe(true);
    });

    it('LOCAL_EDITEDの場合にfalseを返す', () => {
      const statusInfo: FileStatusInfo = {
        path: 'file.md',
        status: UpdateStatus.LOCAL_EDITED,
        hasLocalEdit: true,
        hasRemoteUpdate: false,
      };

      expect(canAutoUpdate(statusInfo)).toBe(false);
    });

    it('CONFLICTの場合にfalseを返す', () => {
      const statusInfo: FileStatusInfo = {
        path: 'file.md',
        status: UpdateStatus.CONFLICT,
        hasLocalEdit: true,
        hasRemoteUpdate: true,
      };

      expect(canAutoUpdate(statusInfo)).toBe(false);
    });

    it('UP_TO_DATEの場合にfalseを返す', () => {
      const statusInfo: FileStatusInfo = {
        path: 'file.md',
        status: UpdateStatus.UP_TO_DATE,
        hasLocalEdit: false,
        hasRemoteUpdate: false,
      };

      expect(canAutoUpdate(statusInfo)).toBe(false);
    });

    it('ERRORの場合にfalseを返す', () => {
      const statusInfo: FileStatusInfo = {
        path: 'file.md',
        status: UpdateStatus.ERROR,
        hasLocalEdit: false,
        hasRemoteUpdate: false,
      };

      expect(canAutoUpdate(statusInfo)).toBe(false);
    });
  });

  describe('FileStatusInfo構造', () => {
    it('必須フィールドを含む', () => {
      const statusInfo: FileStatusInfo = {
        path: 'test.md',
        status: UpdateStatus.UP_TO_DATE,
        hasLocalEdit: false,
        hasRemoteUpdate: false,
      };

      expect(statusInfo).toHaveProperty('path');
      expect(statusInfo).toHaveProperty('status');
      expect(statusInfo).toHaveProperty('hasLocalEdit');
      expect(statusInfo).toHaveProperty('hasRemoteUpdate');
    });

    it('オプショナルフィールドを含むことができる', () => {
      const statusInfo: FileStatusInfo = {
        path: 'test.md',
        status: UpdateStatus.REMOTE_UPDATED,
        hasLocalEdit: false,
        hasRemoteUpdate: true,
        remoteSha: 'new-sha',
        recordedSha: 'old-sha',
        currentHash: 'hash123',
        recordedHash: 'hash123',
      };

      expect(statusInfo).toHaveProperty('remoteSha');
      expect(statusInfo).toHaveProperty('recordedSha');
      expect(statusInfo).toHaveProperty('currentHash');
      expect(statusInfo).toHaveProperty('recordedHash');
    });

    it('エラー情報を含むことができる', () => {
      const statusInfo: FileStatusInfo = {
        path: 'test.md',
        status: UpdateStatus.ERROR,
        hasLocalEdit: false,
        hasRemoteUpdate: false,
        error: 'Test error',
      };

      expect(statusInfo).toHaveProperty('error');
      expect(statusInfo.error).toBe('Test error');
    });
  });
});
