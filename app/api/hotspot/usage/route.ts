import { NextRequest } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { getUserFromRequest } from '@/lib/auth';
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  serverErrorResponse,
} from '@/lib/api-response';
import { mtGetActiveSessions } from '@/lib/mikrotik-service';

// GET - Get current user's usage stats
export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    const userData = getUserFromRequest(request);
    if (!userData) return unauthorizedResponse();

    const user = await User.findById(userData.id);
    if (!user) return errorResponse('User not found', 404);

    // Get active session from MikroTik
    let activeSession: Record<string, unknown> | null = null;
    let uptime = '0s';
    let bytesIn = 0;
    let bytesOut = 0;

    try {
      const activeUsers = await Promise.race([
        mtGetActiveSessions(),
        new Promise<Record<string, unknown>[]>((_, reject) => setTimeout(() => reject(new Error('MikroTik timeout')), 3000)),
      ]);
      activeSession = activeUsers.find((u) => {
        return (u['user'] || u['name']) === user.hotspotUsername;
      }) || null;

      if (activeSession) {
        uptime = (activeSession['uptime'] as string) || '0s';
        bytesIn = parseInt((activeSession['bytes-in'] || activeSession['upload'] || '0') as string, 10);
        bytesOut = parseInt((activeSession['bytes-out'] || activeSession['download'] || '0') as string, 10);
      }
    } catch {
      // MikroTik unavailable
    }

    // Calculate remaining time
    let remainingTime = 'N/A';
    let daysLeft: number | null = null;

    if (user.expiresAt) {
      const now = new Date();
      const diff = user.expiresAt.getTime() - now.getTime();
      if (diff > 0) {
        daysLeft = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        remainingTime = `${daysLeft}d ${hours}h`;
      } else {
        remainingTime = 'Expired';
      }
    }

    return successResponse({
      account: {
        status: user.status,
        profile: user.hotspotProfile,
        activatedAt: user.activatedAt,
        expiresAt: user.expiresAt,
        remainingTime,
        daysLeft,
      },
      usage: {
        currentlyActive: !!activeSession,
        uptime,
        bytesIn,
        bytesOut,
        totalMB: ((bytesIn + bytesOut) / (1024 * 1024)).toFixed(2),
      },
    });
  } catch (error) {
    console.error('Get usage error:', error);
    return serverErrorResponse('Failed to fetch usage');
  }
}
