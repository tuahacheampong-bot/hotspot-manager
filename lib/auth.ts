import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { NextRequest } from 'next/server';
import { unauthorizedResponse, forbiddenResponse } from '@/lib/api-response';

const JWT_SECRET = process.env.NEXTAUTH_SECRET || 'fallback-secret-change-me';

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(password, salt);
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

export function signToken(payload: Record<string, unknown>): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): Record<string, unknown> | null {
  try {
    return jwt.verify(token, JWT_SECRET) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function getTokenFromRequest(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  const cookieToken = request.cookies.get('auth_token')?.value;
  return cookieToken || null;
}

export function getUserFromRequest(request: NextRequest): { id: string; role: string } | null {
  const token = getTokenFromRequest(request);
  if (!token) return null;

  const decoded = verifyToken(token);
  if (!decoded || typeof decoded.sub !== 'string') return null;

  return {
    id: decoded.sub as string,
    role: (decoded.role as string) || 'user',
  };
}

export function requireAdmin(request: NextRequest): { id: string; role: string } | Response {
  const userData = getUserFromRequest(request);
  if (!userData) return unauthorizedResponse();
  if (userData.role !== 'admin') return forbiddenResponse();
  return userData;
}
