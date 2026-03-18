import { RouterOSAPI } from 'routeros';
import { generateVoucherCode } from '@/lib/utils';

interface MikroTikConfig {
  host: string;
  port: number;
  user: string;
  password: string;
}

let api: RouterOSAPI | null = null;

function getConfig(): MikroTikConfig {
  return {
    host: process.env.MIKROTIK_HOST || '192.168.1.1',
    port: parseInt(process.env.MIKROTIK_PORT || '8728', 10),
    user: process.env.MIKROTIK_USER || 'admin',
    password: process.env.MIKROTIK_PASSWORD || '',
  };
}

export function getMikroTikMode(): 'usermanager' | 'hotspot' {
  return (process.env.MIKROTIK_MODE || 'usermanager') as 'usermanager' | 'hotspot';
}

export async function getMikroTikClient(): Promise<RouterOSAPI> {
  if (api && api.connected) {
    return api;
  }

  // Clean up stale connection
  if (api) {
    try {
      await api.close();
    } catch { /* ignore */ }
    api = null;
  }

  const config = getConfig();

  if (!config.host || !config.password) {
    throw new Error('MikroTik connection not configured. Set MIKROTIK_HOST and MIKROTIK_PASSWORD.');
  }

  api = new RouterOSAPI({
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
    timeout: 8000,
    keepalive: true,
  });

  await api.connect();
  return api;
}

export async function disconnectMikroTik(): Promise<void> {
  if (api && api.connected) {
    await api.close();
    api = null;
  }
}

// ============================================
// Hotspot User Management via MikroTik API
// ============================================

export async function createHotspotUser(
  username: string,
  password: string,
  profile?: string,
  uptimeLimit?: string,
  bytesLimit?: number
): Promise<Record<string, unknown>> {
  const client = await getMikroTikClient();

  // Remove existing user if they exist (profile switch)
  const existingUsers = await client.write('/ip/hotspot/user/print', ['?name=' + username]);
  if (Array.isArray(existingUsers) && existingUsers.length > 0) {
    const existingId = (existingUsers[0] as Record<string, unknown>)['.id'];
    await client.write('/ip/hotspot/user/remove', ['=.id=' + existingId]);
  }

  // Also remove from active sessions if connected
  const activeSessions = await client.write('/ip/hotspot/active/print', ['?user=' + username]);
  if (Array.isArray(activeSessions) && activeSessions.length > 0) {
    const sessionId = (activeSessions[0] as Record<string, unknown>)['.id'];
    await client.write('/ip/hotspot/active/remove', ['=.id=' + sessionId]);
  }

  const params = [
    '=name=' + username,
    '=password=' + password,
    '=disabled=' + (profile ? 'no' : 'yes'),
  ];

  if (profile) {
    params.push('=profile=' + profile);
    params.push('=limit-uptime=' + (uptimeLimit || '0s'));
    if (bytesLimit) {
      params.push('=limit-bytes-total=' + bytesLimit.toString());
    }
  }

  const result = await client.write('/ip/hotspot/user/add', params);
  return result as unknown as Record<string, unknown>;
}

export async function disableHotspotUser(username: string): Promise<void> {
  const client = await getMikroTikClient();
  const users = await client.write('/ip/hotspot/user/print', ['?name=' + username]);

  if (Array.isArray(users) && users.length > 0) {
    const id = (users[0] as Record<string, unknown>)['.id'];
    await client.write('/ip/hotspot/user/disable', ['=.id=' + id]);
  }
}

export async function removeHotspotUser(username: string): Promise<void> {
  const client = await getMikroTikClient();
  const users = await client.write('/ip/hotspot/user/print', ['?name=' + username]);

  if (Array.isArray(users) && users.length > 0) {
    const id = (users[0] as Record<string, unknown>)['.id'];
    await client.write('/ip/hotspot/user/remove', ['=.id=' + id]);
  }
}

export async function getHotspotUsers(): Promise<Record<string, unknown>[]> {
  const client = await getMikroTikClient();
  const users = await client.write('/ip/hotspot/user/print');
  return users as unknown as Record<string, unknown>[];
}

export async function getHotspotUser(username: string): Promise<Record<string, unknown> | null> {
  const client = await getMikroTikClient();
  const users = await client.write('/ip/hotspot/user/print', ['?name=' + username]);
  const arr = users as unknown as Record<string, unknown>[];
  return arr.length > 0 ? arr[0] : null;
}

export async function hotspotUserExists(username: string): Promise<boolean> {
  const client = await getMikroTikClient();
  const users = await client.write('/ip/hotspot/user/print', ['?name=' + username]);
  return Array.isArray(users) && users.length > 0;
}

export async function getHotspotActive(): Promise<Record<string, unknown>[]> {
  const client = await getMikroTikClient();
  const active = await client.write('/ip/hotspot/active/print');
  return active as unknown as Record<string, unknown>[];
}

export async function getHotspotProfiles(): Promise<Record<string, unknown>[]> {
  const client = await getMikroTikClient();
  const profiles = await client.write('/ip/hotspot/user/profile/print');
  return profiles as unknown as Record<string, unknown>[];
}

// ============================================
// Hotspot Profile Management (sync plans)
// ============================================

export async function createMikroTikProfile(
  name: string,
  uptimeLimit: string,
  sharedUsers: number = 1
): Promise<void> {
  const client = await getMikroTikClient();

  const params = [
    '=name=' + name,
    '=idle-timeout=30m',
    '=status-autorefresh=1m',
    '=shared-users=' + sharedUsers,
  ];

  if (uptimeLimit && uptimeLimit !== '0s') {
    params.push('=limit-uptime=' + uptimeLimit);
  }

  await client.write('/ip/hotspot/user/profile/add', params);
}

export async function updateMikroTikProfile(
  name: string,
  uptimeLimit: string,
  sharedUsers: number = 1
): Promise<void> {
  const client = await getMikroTikClient();
  const profiles = await client.write('/ip/hotspot/user/profile/print', ['?name=' + name]);

  if (Array.isArray(profiles) && profiles.length > 0) {
    const id = (profiles[0] as Record<string, unknown>)['.id'];
    const params = [
      '=.id=' + id,
      '=idle-timeout=30m',
      '=status-autorefresh=1m',
      '=shared-users=' + sharedUsers,
    ];

    if (uptimeLimit && uptimeLimit !== '0s') {
      params.push('=limit-uptime=' + uptimeLimit);
    } else {
      params.push('=limit-uptime=');
    }

    await client.write('/ip/hotspot/user/profile/set', params);
  } else {
    // Profile doesn't exist yet, create it
    await createMikroTikProfile(name, uptimeLimit, sharedUsers);
  }
}

export async function removeMikroTikProfile(name: string): Promise<void> {
  const client = await getMikroTikClient();
  const profiles = await client.write('/ip/hotspot/user/profile/print', ['?name=' + name]);

  if (Array.isArray(profiles) && profiles.length > 0) {
    const id = (profiles[0] as Record<string, unknown>)['.id'];
    await client.write('/ip/hotspot/user/profile/remove', ['=.id=' + id]);
  }
}

// ============================================
// Profile Configurations
// ============================================

export type HotspotProfile = '1-day' | '7-day' | 'monthly' | 'unlimited';

export const PROFILE_CONFIG: Record<string, { uptime: string; bytes: number }> = {
  '1-day': { uptime: '1d0h', bytes: 10 * 1024 * 1024 * 1024 },      // 10GB
  '7-day': { uptime: '7d0h', bytes: 50 * 1024 * 1024 * 1024 },     // 50GB
  monthly: { uptime: '30d0h', bytes: 150 * 1024 * 1024 * 1024 },   // 150GB
  unlimited: { uptime: '0s', bytes: 0 },                              // Unlimited
};

export function getProfileConfig(profile: string) {
  return PROFILE_CONFIG[profile] || PROFILE_CONFIG['1-day'];
}

// ============================================
// MikroTik User Manager (RADIUS) Functions
// ============================================

// --- User Manager Users ---

export async function umCreateUser(
  username: string,
  password: string,
  profile?: string,
  sharedUsers: number = 1
): Promise<void> {
  const client = await getMikroTikClient();

  // Remove existing user if they exist (profile switch)
  const existing = await client.write('/user-manager/user/print', ['?name=' + username]);
  if (Array.isArray(existing) && existing.length > 0) {
    const id = (existing[0] as Record<string, unknown>)['.id'];
    // Remove old user-profiles first
    const profiles = await client.write('/user-manager/user-profile/print', ['?user=' + username]);
    if (Array.isArray(profiles)) {
      for (const p of profiles) {
        await client.write('/user-manager/user-profile/remove', ['=.id=' + (p as Record<string, unknown>)['.id']]);
      }
    }
    await client.write('/user-manager/user/remove', ['=.id=' + id]);
  }

  // Create the user
  await client.write('/user-manager/user/add', [
    '=name=' + username,
    '=password=' + password,
    '=shared-users=' + sharedUsers,
    '=disabled=no',
  ]);

  // Assign profile via user-profile (uses username, not ID)
  if (profile) {
    await client.write('/user-manager/user-profile/add', [
      '=user=' + username,
      '=profile=' + profile,
    ]);
  }
}

export async function umDisableUser(username: string): Promise<void> {
  const client = await getMikroTikClient();
  const users = await client.write('/user-manager/user/print', ['?name=' + username]);
  if (Array.isArray(users) && users.length > 0) {
    const id = (users[0] as Record<string, unknown>)['.id'];
    await client.write('/user-manager/user/set', ['=.id=' + id, '=disabled=yes']);
  }
}

export async function umRemoveUser(username: string): Promise<void> {
  const client = await getMikroTikClient();

  // Remove user-profiles first (MikroTik requires this before user removal)
  const profiles = await client.write('/user-manager/user-profile/print', ['?user=' + username]);
  if (Array.isArray(profiles)) {
    for (const p of profiles) {
      await client.write('/user-manager/user-profile/remove', ['=.id=' + (p as Record<string, unknown>)['.id']]);
    }
  }

  // Then remove the user
  const users = await client.write('/user-manager/user/print', ['?name=' + username]);
  if (Array.isArray(users) && users.length > 0) {
    const id = (users[0] as Record<string, unknown>)['.id'];
    await client.write('/user-manager/user/remove', ['=.id=' + id]);
  }
}

export async function umGetUsers(): Promise<Record<string, unknown>[]> {
  const client = await getMikroTikClient();
  const users = await client.write('/user-manager/user/print');
  return users as unknown as Record<string, unknown>[];
}

export async function umUserExists(username: string): Promise<boolean> {
  const client = await getMikroTikClient();
  const users = await client.write('/user-manager/user/print', ['?name=' + username]);
  return Array.isArray(users) && users.length > 0;
}

// --- User Manager Profiles (Plans) ---

export async function umCreateProfile(
  name: string,
  priceOverride: string = '0',
  validity: string = 'unlimited',
  startTime: string = '0s'
): Promise<void> {
  const client = await getMikroTikClient();

  // Check if profile exists
  const existing = await client.write('/user-manager/profile/print', ['?name=' + name]);
  if (Array.isArray(existing) && existing.length > 0) return;

  await client.write('/user-manager/profile/add', [
    '=name=' + name,
    '=price-overrides=' + priceOverride,
    '=validity=' + validity,
    '=starts-at=' + startTime,
    '=owner=' + 'admin',
  ]);
}

export async function umUpdateProfile(
  name: string,
  validity: string,
  priceOverride: string = '0'
): Promise<void> {
  const client = await getMikroTikClient();
  const profiles = await client.write('/user-manager/profile/print', ['?name=' + name]);

  if (Array.isArray(profiles) && profiles.length > 0) {
    const id = (profiles[0] as Record<string, unknown>)['.id'];
    await client.write('/user-manager/profile/set', [
      '=.id=' + id,
      '=validity=' + validity,
      '=price-overrides=' + priceOverride,
    ]);
  } else {
    await umCreateProfile(name, priceOverride, validity);
  }
}

export async function umRemoveProfile(name: string): Promise<void> {
  const client = await getMikroTikClient();
  const profiles = await client.write('/user-manager/profile/print', ['?name=' + name]);
  if (Array.isArray(profiles) && profiles.length > 0) {
    const id = (profiles[0] as Record<string, unknown>)['.id'];
    await client.write('/user-manager/profile/remove', ['=.id=' + id]);
  }
}

// --- User Manager Limitations ---

export async function umCreateLimitation(
  name: string,
  uptimeLimit: string = '0s',
  bytesLimit: number = 0,
  rateLimit: string = ''
): Promise<void> {
  const client = await getMikroTikClient();

  // Check if limitation exists
  const existing = await client.write('/user-manager/limitation/print', ['?name=' + name]);
  if (Array.isArray(existing) && existing.length > 0) return;

  const params = [
    '=name=' + name,
    '=uptime-limit=' + uptimeLimit,
  ];

  if (bytesLimit > 0) {
    params.push('=transfer-limit=' + bytesLimit.toString());
    params.push('=transfer-limit-type=both');
  }

  if (rateLimit) {
    params.push('=rate-limit=' + rateLimit);
  }

  await client.write('/user-manager/limitation/add', params);
}

export async function umUpdateLimitation(
  name: string,
  uptimeLimit: string = '0s',
  bytesLimit: number = 0,
  rateLimit: string = ''
): Promise<void> {
  const client = await getMikroTikClient();
  const limits = await client.write('/user-manager/limitation/print', ['?name=' + name]);

  const params = [
    '=uptime-limit=' + uptimeLimit,
  ];

  if (bytesLimit > 0) {
    params.push('=transfer-limit=' + bytesLimit.toString());
    params.push('=transfer-limit-type=both');
  } else {
    params.push('=transfer-limit=');
  }

  if (rateLimit) {
    params.push('=rate-limit=' + rateLimit);
  }

  if (Array.isArray(limits) && limits.length > 0) {
    const id = (limits[0] as Record<string, unknown>)['.id'];
    await client.write('/user-manager/limitation/set', ['=.id=' + id, ...params]);
  } else {
    await client.write('/user-manager/limitation/add', ['=name=' + name, ...params]);
  }
}

// Assign limitation to a profile
export async function umAssignLimitationToProfile(
  profileName: string,
  limitationName: string
): Promise<void> {
  const client = await getMikroTikClient();

  // Get profile ID
  const profiles = await client.write('/user-manager/profile/print', ['?name=' + profileName]);
  if (!Array.isArray(profiles) || profiles.length === 0) return;
  const profileId = (profiles[0] as Record<string, unknown>)['.id'];

  // Get limitation ID
  const limits = await client.write('/user-manager/limitation/print', ['?name=' + limitationName]);
  if (!Array.isArray(limits) || limits.length === 0) return;
  const limitId = (limits[0] as Record<string, unknown>)['.id'];

  // Check if already assigned
  const existing = await client.write('/user-manager/profile-limitation/print', [
    '?profile=' + profileId,
    '?limitation=' + limitId,
  ]);
  if (Array.isArray(existing) && existing.length > 0) return;

  await client.write('/user-manager/profile-limitation/add', [
    '=profile=' + profileId,
    '=limitation=' + limitId,
  ]);
}

// --- User Manager Sessions ---

export async function umGetActiveSessions(): Promise<Record<string, unknown>[]> {
  const client = await getMikroTikClient();
  const sessions = await client.write('/user-manager/session/print');
  const allSessions = sessions as unknown as Record<string, unknown>[];
  // Filter by the 'active' field (string 'true'/'false')
  return allSessions.filter((s) => s['active'] === 'true');
}

export async function umGetAllSessions(): Promise<Record<string, unknown>[]> {
  const client = await getMikroTikClient();
  const sessions = await client.write('/user-manager/session/print');
  return sessions as unknown as Record<string, unknown>[];
}

// --- User Manager Vouchers ---

export async function umGenerateVouchers(
  profile: string,
  count: number,
  customer: string = 'admin'
): Promise<Record<string, unknown>[]> {
  const client = await getMikroTikClient();
  const vouchers: Record<string, unknown>[] = [];

  for (let i = 0; i < count; i++) {
    const code = generateVoucherCode();
    await client.write('/user-manager/user/add', [
      '=customer=' + customer,
      '=name=' + code,
      '=password=' + code,
      '=shared-users=1',
      '=disabled=no',
    ]);

    // Assign profile via user-profile (uses username, not ID)
    await client.write('/user-manager/user-profile/add', [
      '=user=' + code,
      '=profile=' + profile,
    ]);

    vouchers.push({ code, profile, status: 'unused' });
  }

  return vouchers;
}


