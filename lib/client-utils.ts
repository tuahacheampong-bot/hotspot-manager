/**
 * Shared client-side utility functions (safe to import in 'use client' components)
 */

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
 * Authenticated fetch — sends cookies automatically.
 * Auth is handled via httpOnly cookies set by the server.
 * No manual token management needed.
 */
export function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  return fetch(url, {
    ...options,
    credentials: 'same-origin', // send cookies automatically
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
}

/**
 * Logout helper — clears cookie and redirects to login.
 */
export function logout(router: { push: (url: string) => void }) {
  document.cookie = 'auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
  router.push('/login');
}
