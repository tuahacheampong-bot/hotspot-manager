import { NextRequest } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import Plan from '@/models/Plan';
import { requireAdmin } from '@/lib/auth';
import {
  successResponse,
  errorResponse,
  notFoundResponse,
  serverErrorResponse,
} from '@/lib/api-response';
import { mtCreateUser, mtRemoveUser } from '@/lib/mikrotik-service';
import { parseDurationToMs } from '@/lib/utils';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect();

    const currentUser = requireAdmin(request);
    if (currentUser instanceof Response) return currentUser;

    const { id } = params;
    const body = await request.json();
    const { status } = body;

    if (!['active', 'inactive', 'expired', 'suspended'].includes(status)) {
      return errorResponse('Invalid status value');
    }

    const user = await User.findById(id);
    if (!user) return notFoundResponse('User not found');

    // Handle MikroTik integration based on status change
    if (status === 'active' && user.status !== 'active') {
      // Get plan from database for correct limits
      const profileId = user.hotspotProfile || '1-day';
      const plan = await Plan.findOne({ planId: profileId, active: true });
      const uptimeLimit = plan?.uptimeLimit || '1d0h';
      const bytesLimit = plan?.bytesLimit || 0;

      const now = new Date();
      const expiresAt = new Date(now.getTime() + parseDurationToMs(uptimeLimit));

      user.activatedAt = now;
      user.expiresAt = expiresAt;

      // Use username (or phone fallback) as hotspot username
      if (!user.hotspotUsername) {
        user.hotspotUsername = user.username || user.phone.replace(/[^0-9]/g, '');
      }

      try {
        // Use stored hotspot password (plain password) for MikroTik
        const userWithPassword = await User.findById(id).select('+hotspotPassword');
        const mikrotikPassword = userWithPassword?.hotspotPassword;
        if (userWithPassword && mikrotikPassword) {
          await mtCreateUser(
            user.hotspotUsername,
            mikrotikPassword,
            profileId,
            uptimeLimit,
            bytesLimit
          );
        }
      } catch (mikrotikError) {
        console.error('MikroTik activation error:', mikrotikError);
      }
    }

    if (status === 'suspended' || status === 'inactive') {
      // Remove from MikroTik hotspot
      if (user.hotspotUsername) {
        try {
          await mtRemoveUser(user.hotspotUsername);
        } catch (mikrotikError) {
          console.error('MikroTik removal error:', mikrotikError);
        }
      }
    }

    user.status = status;
    await user.save();

    return successResponse({
      id: user._id,
      name: user.name,
      status: user.status,
      activatedAt: user.activatedAt,
      expiresAt: user.expiresAt,
    });
  } catch (error) {
    console.error('Update user error:', error);
    return serverErrorResponse('Failed to update user');
  }
}

// DELETE - Remove a user
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect();

    const currentUser = requireAdmin(request);
    if (currentUser instanceof Response) return currentUser;

    const { id } = params;
    const user = await User.findById(id);
    if (!user) return notFoundResponse('User not found');

    // Remove from MikroTik
    if (user.hotspotUsername) {
      try {
        await mtRemoveUser(user.hotspotUsername);
      } catch (mikrotikError) {
        console.error('MikroTik removal error:', mikrotikError);
      }
    }

    await User.findByIdAndDelete(id);

    return successResponse({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    return serverErrorResponse('Failed to delete user');
  }
}

