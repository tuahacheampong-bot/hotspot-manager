import { NextRequest } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { getUserFromRequest } from '@/lib/auth';
import {
  successResponse,
  unauthorizedResponse,
  forbiddenResponse,
  serverErrorResponse,
} from '@/lib/api-response';
import { mtGetActiveSessions } from '@/lib/mikrotik-service';
import { getMikroTikMode } from '@/lib/mikrotik';

// GET - Get all active hotspot sessions (admin only)
export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    const currentUser = getUserFromRequest(request);
    if (!currentUser) return unauthorizedResponse();
    if (currentUser.role !== 'admin') return forbiddenResponse();

    const mode = getMikroTikMode();
    let activeSessions: Record<string, unknown>[] = [];

    try {
      activeSessions = await mtGetActiveSessions();
    } catch (mikrotikError) {
      console.error('MikroTik sessions fetch error:', mikrotikError);
      return successResponse([], 200);
    }

    // Batch-load user data
    const usernames = activeSessions.map(
      (s) => ((s['user'] || s['name']) as string) || ''
    ).filter(Boolean);

    const dbUsers = await User.find({ hotspotUsername: { $in: usernames } }).lean();
    const userMap = new Map(dbUsers.map((u) => [u.hotspotUsername, u]));

    const enrichedSessions = activeSessions.map((session) => {
      const username = (session['user'] || session['name'] || session['username']) as string || '';
      const dbUser = userMap.get(username) || null;

      // Normalize fields between hotspot and usermanager
      const bytesIn = parseInt(
        (session['bytes-in'] || session['upload'] || '0') as string, 10
      );
      const bytesOut = parseInt(
        (session['bytes-out'] || session['download'] || '0') as string, 10
      );

      return {
        id: session['.id'] || session['id'] || '',
        username,
        ipAddress: (session['address'] || session['ip-address'] || session['user-address'] || '') as string,
        macAddress: (session['mac-address'] || session['caller-id'] || session['calling-station-id'] || '') as string,
        uptime: (session['uptime'] || '0s') as string,
        bytesIn,
        bytesOut,
        totalMB: ((bytesIn + bytesOut) / (1024 * 1024)).toFixed(2),
        loginBy: (session['login-by'] || session['protocol'] || mode) as string,
        dbUser: dbUser
          ? {
              id: dbUser._id,
              name: dbUser.name,
              phone: dbUser.phone,
              profile: dbUser.hotspotProfile,
              status: dbUser.status,
              expiresAt: dbUser.expiresAt,
            }
          : null,
      };
    });

    return successResponse(enrichedSessions);
  } catch (error) {
    console.error('Get sessions error:', error);
    return serverErrorResponse('Failed to fetch active sessions');
  }
}
