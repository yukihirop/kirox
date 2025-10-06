/**
 * Hash Calculator
 *
 * Handles SHA-256 hash calculation for file content tracking
 */

import crypto from 'crypto';

/**
 * Calculate SHA-256 hash of content
 *
 * @param content - String content to hash
 * @returns 64-character hexadecimal hash string
 */
export function calculateHash(content: string): string {
  return crypto.createHash('sha256').update(content, 'utf-8').digest('hex');
}
