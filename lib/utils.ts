/**
 * Shared utility functions
 */

/**
 * Parse a MikroTik duration string (e.g. "1d0h", "7d0h", "30d0h", "0s")
 * into milliseconds. Returns 30 days for "0s" (unlimited).
 */
export function parseDurationToMs(duration: string): number {
  if (duration === '0s') return 30 * 24 * 60 * 60 * 1000;

  const match = duration.match(/^(\d+)d(\d+)h$/);
  if (match) {
    const days = parseInt(match[1]);
    const hours = parseInt(match[2]);
    return (days * 24 + hours) * 60 * 60 * 1000;
  }

  return 24 * 60 * 60 * 1000;
}

/**
 * Format bytes to a human-readable string (B, KB, MB, GB, TB).
 */
export function formatBytes(bytes?: number): string {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Generate a voucher code with dashes every 4 characters.
 * Excludes ambiguous characters (I, O, 0, 1).
 */
export function generateVoucherCode(length = 8): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < length; i++) {
    if (i > 0 && i % 4 === 0) code += '-';
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}
