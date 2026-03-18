// Types for the Hotspot Management System

export interface User {
  _id: string;
  name: string;
  phone: string;
  email?: string;
  password: string;
  role: 'user' | 'admin';
  hotspotUsername?: string;
  hotspotProfile?: HotspotProfile;
  status: 'active' | 'inactive' | 'expired' | 'suspended';
  activatedAt?: string;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type HotspotProfile = string;

export interface Voucher {
  _id: string;
  code: string;
  profile: HotspotProfile;
  status: 'unused' | 'used' | 'expired';
  createdBy: string;
  usedBy?: string;
  usedAt?: string;
  expiresAt?: string;
  createdAt: string;
}

export interface HotspotUserInfo {
  username: string;
  profile: string;
  uptime: string;
  bytesIn: number;
  bytesOut: number;
  status: string;
  createdAt?: string;
  expiresAt?: string;
}

export interface PlanInfo {
  id: HotspotProfile;
  name: string;
  price: number;
  duration: string;
  description: string;
  features: string[];
  popular?: boolean;
}
