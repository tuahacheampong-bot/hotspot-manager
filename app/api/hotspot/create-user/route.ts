import { NextRequest } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import Plan from '@/models/Plan';
import { getUserFromRequest } from '@/lib/auth';
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  serverErrorResponse,
} from '@/lib/api-response';
import { mtCreateUser } from '@/lib/mikrotik-service';
import { parseDurationToMs } from '@/lib/utils';

// POST - Activate hotspot for a registered user
export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    const currentUser = getUserFromRequest(request);
    if (!currentUser) return unauthorizedResponse();

    const body = await request.json();
    const { userId, profile } = body;

    if (!userId || !profile) {
      return errorResponse('userId and profile are required');
    }

    // Only allow users to activate themselves, or admins to activate anyone
    if (currentUser.id !== userId && currentUser.role !== 'admin') {
      return errorResponse('Unauthorized', 403);
    }

    const user = await User.findById(userId).select('+hotspotPassword');
    if (!user) {
      return errorResponse('User not found', 404);
    }

    user.hotspotProfile = profile;

    // Get plan from database for correct limits (not hardcoded config)
    const plan = await Plan.findOne({ planId: profile, active: true });
    if (!plan) {
      return errorResponse('Plan not found or inactive', 404);
    }
    const uptimeLimit = plan.uptimeLimit || '0s';
    const bytesLimit = plan.bytesLimit || 0;

    const now = new Date();
    const expiresAt = new Date(now.getTime() + parseDurationToMs(uptimeLimit));

    // Use username (or phone fallback) as hotspot username
    if (!user.hotspotUsername) {
      user.hotspotUsername = user.username || user.phone.replace(/[^0-9]/g, '');
    }

    // Use stored hotspot password (plain password saved at registration)
    const mikrotikPassword = user.hotspotPassword;
    if (!mikrotikPassword) {
      return errorResponse('No hotspot password found for this user. User may need to re-register.', 500);
    }

    // Create on MikroTik (hotspot or usermanager)
    try {
      await mtCreateUser(
        user.hotspotUsername,
        mikrotikPassword,
        profile,
        uptimeLimit,
        bytesLimit
      );
    } catch (mikrotikError) {
      console.error('MikroTik error:', mikrotikError);
      return serverErrorResponse('Failed to create user on router');
    }

    // Update user
    user.status = 'active';
    user.activatedAt = now;
    user.expiresAt = expiresAt;
    await user.save();

    return successResponse({
      hotspotUsername: user.hotspotUsername,
      profile: user.hotspotProfile,
      activatedAt: user.activatedAt,
      expiresAt: user.expiresAt,
    });
  } catch (error) {
    console.error('Create hotspot user error:', error);
    return serverErrorResponse('Failed to create hotspot user');
  }
}


