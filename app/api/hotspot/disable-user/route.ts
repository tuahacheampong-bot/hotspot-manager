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
import { mtDisableUser } from '@/lib/mikrotik-service';

// POST - Disable a hotspot user
export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    const currentUser = getUserFromRequest(request);
    if (!currentUser) return unauthorizedResponse();

    const body = await request.json();
    const { userId } = body;

    // Only admins can disable users, or users can disable themselves
    if (currentUser.id !== userId && currentUser.role !== 'admin') {
      return errorResponse('Unauthorized', 403);
    }

    const user = await User.findById(userId);
    if (!user) return errorResponse('User not found', 404);

    if (user.hotspotUsername) {
      try {
        await mtDisableUser(user.hotspotUsername);
      } catch (mikrotikError) {
        console.error('MikroTik disable error:', mikrotikError);
      }
    }

    user.status = 'inactive';
    await user.save();

    return successResponse({ message: 'Hotspot user disabled successfully' });
  } catch (error) {
    console.error('Disable hotspot user error:', error);
    return serverErrorResponse('Failed to disable hotspot user');
  }
}
