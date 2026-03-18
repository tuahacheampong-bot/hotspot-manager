/**
 * MikroTik Service — unified API that routes to Hotspot or User Manager
 * based on MIKROTIK_MODE env variable.
 */

import {
  getMikroTikMode,
  // Hotspot API
  createHotspotUser,
  disableHotspotUser,
  removeHotspotUser,
  getHotspotUsers,
  getHotspotActive,
  hotspotUserExists,
  createMikroTikProfile,
  updateMikroTikProfile,
  removeMikroTikProfile,
  // User Manager API
  umCreateUser,
  umDisableUser,
  umRemoveUser,
  umGetUsers,
  umUserExists,
  umGetActiveSessions,
  umCreateProfile,
  umUpdateProfile,
  umRemoveProfile,
  umCreateLimitation,
  umUpdateLimitation,
  umAssignLimitationToProfile,
} from './mikrotik';

const mode = () => getMikroTikMode();

// ============================================
// User Management
// ============================================

export async function mtCreateUser(
  username: string,
  password: string,
  profile?: string,
  uptimeLimit?: string,
  bytesLimit?: number
): Promise<void> {
  if (mode() === 'usermanager') {
    const sharedUsers = profile?.startsWith('data-') ? 0 : 1;
    await umCreateUser(username, password, profile, sharedUsers);
  } else {
    await createHotspotUser(username, password, profile, uptimeLimit, bytesLimit);
  }
}

export async function mtDisableUser(username: string): Promise<void> {
  if (mode() === 'usermanager') {
    await umDisableUser(username);
  } else {
    await disableHotspotUser(username);
  }
}

export async function mtRemoveUser(username: string): Promise<void> {
  if (mode() === 'usermanager') {
    await umRemoveUser(username);
  } else {
    await removeHotspotUser(username);
  }
}

export async function mtGetUsers(): Promise<Record<string, unknown>[]> {
  if (mode() === 'usermanager') {
    return umGetUsers();
  } else {
    return getHotspotUsers();
  }
}

export async function mtUserExists(username: string): Promise<boolean> {
  if (mode() === 'usermanager') {
    return umUserExists(username);
  } else {
    return hotspotUserExists(username);
  }
}

// ============================================
// Active Sessions
// ============================================

export async function mtGetActiveSessions(): Promise<Record<string, unknown>[]> {
  if (mode() === 'usermanager') {
    return umGetActiveSessions();
  } else {
    return getHotspotActive();
  }
}

// ============================================
// Profile / Plan Management
// ============================================

export async function mtCreateProfile(
  planId: string,
  uptimeLimit: string,
  bytesLimit: number
): Promise<void> {
  if (mode() === 'usermanager') {
    // Create a limitation for this plan
    const limitName = `${planId}-limit`;
    await umCreateLimitation(limitName, uptimeLimit, bytesLimit);
    // Create the profile
    await umCreateProfile(planId);
    // Assign limitation to profile
    await umAssignLimitationToProfile(planId, limitName);
  } else {
    await createMikroTikProfile(planId, uptimeLimit);
  }
}

export async function mtUpdateProfile(
  planId: string,
  uptimeLimit: string,
  bytesLimit: number
): Promise<void> {
  if (mode() === 'usermanager') {
    const limitName = `${planId}-limit`;
    await umUpdateLimitation(limitName, uptimeLimit, bytesLimit);
    await umUpdateProfile(planId, uptimeLimit);
  } else {
    await updateMikroTikProfile(planId, uptimeLimit);
  }
}

export async function mtRemoveProfile(planId: string): Promise<void> {
  if (mode() === 'usermanager') {
    await umRemoveProfile(planId);
  } else {
    await removeMikroTikProfile(planId);
  }
}

// ============================================
// Mode Info
// ============================================

export function mtMode(): string {
  return mode();
}

// Re-export getProfileConfig so consumers can use the service layer
export { getProfileConfig } from './mikrotik';
