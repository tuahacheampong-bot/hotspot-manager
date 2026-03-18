import { NextRequest } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Subscription from '@/models/Subscription';
import User from '@/models/User';
import { requireAdmin } from '@/lib/auth';
import {
  successResponse,
  errorResponse,
  notFoundResponse,
  serverErrorResponse,
} from '@/lib/api-response';
import { mtCreateUser } from '@/lib/mikrotik-service';
import { parseDurationToMs } from '@/lib/utils';
import mongoose from 'mongoose';

// PATCH - Admin confirms or rejects a subscription
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect();

    const userData = requireAdmin(request);
    if (userData instanceof Response) return userData;

    const { id } = params;
    const body = await request.json();
    const { action } = body; // 'confirm' or 'reject'

    if (!['confirm', 'reject'].includes(action)) {
      return errorResponse('Action must be "confirm" or "reject"');
    }

    const subscription = await Subscription.findById(id).populate('userId');
    if (!subscription) return notFoundResponse('Subscription not found');
    if (subscription.status !== 'pending') {
      return errorResponse('Subscription is not pending');
    }

    const user = subscription.userId as unknown as {
      _id: string;
      name: string;
      phone: string;
      username?: string;
      hotspotUsername?: string;
      hotspotProfile?: string;
      status: string;
    };

    if (action === 'reject') {
      subscription.status = 'rejected';
      subscription.confirmedBy = new mongoose.Types.ObjectId(userData.id);
      await subscription.save();
      return successResponse({ message: 'Subscription rejected' });
    }

    // === CONFIRM ===
    const planId = subscription.planId;

    // Get plan from database for correct limits (not hardcoded config)
    const Plan = (await import('@/models/Plan')).default;
    const plan = await Plan.findOne({ planId, active: true });
    if (!plan) {
      return errorResponse('Plan not found or inactive', 404);
    }
    const uptimeLimit = plan.uptimeLimit || '0s';
    const bytesLimit = plan.bytesLimit || 0;

    // Set hotspot username if not set
    if (!user.hotspotUsername) {
      user.hotspotUsername = user.username || user.phone.replace(/[^0-9]/g, '');
    }

    // Get user's plain password for MikroTik
    const userWithPassword = await User.findById(user._id).select('+hotspotPassword');
    const mikrotikPassword = userWithPassword?.hotspotPassword;

    if (!mikrotikPassword) {
      return errorResponse('User has no password set for hotspot. User may need to re-register.', 500);
    }

    // Create user on MikroTik with the selected plan
    try {
      await mtCreateUser(
        user.hotspotUsername!,
        mikrotikPassword,
        planId,
        uptimeLimit,
        bytesLimit
      );
    } catch (mikrotikError) {
      console.error('MikroTik user creation error:', mikrotikError);
      return serverErrorResponse('Failed to create user on MikroTik. Check if profile "' + planId + '" exists.');
    }

    // Update user record
    const now = new Date();
    const isDataBundle = planId.startsWith('data-');
    // Data bundles don't expire by time — only by data usage
    const expiresAt = isDataBundle ? undefined : new Date(now.getTime() + parseDurationToMs(uptimeLimit));

    await User.findByIdAndUpdate(user._id, {
      hotspotUsername: user.hotspotUsername,
      hotspotProfile: planId,
      status: 'active',
      activatedAt: now,
      expiresAt,
    });

    // Update subscription
    subscription.status = 'confirmed';
    subscription.confirmedBy = new mongoose.Types.ObjectId(userData.id);
    subscription.confirmedAt = now;
    await subscription.save();

    return successResponse({
      message: 'Subscription confirmed — user activated on MikroTik',
      user: {
        name: user.name,
        phone: user.phone,
        hotspotUsername: user.hotspotUsername,
        profile: planId,
        activatedAt: now,
        expiresAt,
      },
    });
  } catch (error) {
    console.error('Confirm subscription error:', error);
    return serverErrorResponse('Failed to confirm subscription');
  }
}

// DELETE - Admin deletes a subscription
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect();

    const userData = requireAdmin(request);
    if (userData instanceof Response) return userData;

    const { id } = params;
    const subscription = await Subscription.findById(id);
    if (!subscription) return notFoundResponse('Subscription not found');

    await Subscription.findByIdAndDelete(id);

    return successResponse({ message: 'Subscription deleted' });
  } catch (error) {
    console.error('Delete subscription error:', error);
    return serverErrorResponse('Failed to delete subscription');
  }
}
