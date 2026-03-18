import { NextRequest } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Subscription from '@/models/Subscription';
import User from '@/models/User';
import { getUserFromRequest, requireAdmin } from '@/lib/auth';
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  serverErrorResponse,
} from '@/lib/api-response';

// POST - User requests a plan
export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    const userData = getUserFromRequest(request);
    if (!userData) return unauthorizedResponse();

    const body = await request.json();
    const { planId } = body;

    if (!planId) return errorResponse('planId is required');

    // Check for existing pending request
    const existing = await Subscription.findOne({
      userId: userData.id,
      status: 'pending',
    });
    if (existing) {
      return errorResponse('You already have a pending request. Wait for admin to confirm.', 409);
    }

    // Check if user is already active with a plan
    const user = await User.findById(userData.id);
    if (!user) return errorResponse('User not found', 404);

    if (user.status === 'active' && user.hotspotProfile === planId) {
      return errorResponse('You already have this plan active', 409);
    }

    const subscription = await Subscription.create({
      userId: userData.id,
      planId,
      status: 'pending',
    });

    return successResponse({
      id: subscription._id,
      planId: subscription.planId,
      status: subscription.status,
      createdAt: subscription.createdAt,
    }, 201);
  } catch (error) {
    console.error('Create subscription error:', error);
    return serverErrorResponse('Failed to create subscription');
  }
}

// GET - Admin: list all subscriptions, or user: list their own
export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    const userData = getUserFromRequest(request);
    if (!userData) return unauthorizedResponse();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    if (userData.role === 'admin') {
      // Admin sees all subscriptions with user info
      const filter: Record<string, unknown> = {};
      if (status && status !== 'all') {
        filter.status = status;
      }

      const subscriptions = await Subscription.find(filter)
        .populate({
          path: 'userId',
          select: 'name phone hotspotUsername hotspotProfile status',
        })
        .populate('confirmedBy', 'name')
        .sort({ createdAt: -1 })
        .lean();

      return successResponse(subscriptions);
    } else {
      // User sees only their own
      const filter: Record<string, unknown> = { userId: userData.id };
      if (status) {
        filter.status = status;
      }

      const subscriptions = await Subscription.find(filter)
        .sort({ createdAt: -1 })
        .lean();

      return successResponse(subscriptions);
    }
  } catch (error) {
    console.error('Get subscriptions error:', error);
    return serverErrorResponse('Failed to fetch subscriptions');
  }
}

// DELETE - Admin bulk deletes subscriptions
export async function DELETE(request: NextRequest) {
  try {
    await dbConnect();

    const userData = requireAdmin(request);
    if (userData instanceof Response) return userData;

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const olderThan = searchParams.get('olderThan'); // ISO date string

    const filter: Record<string, unknown> = {};
    if (status && status !== 'all') {
      filter.status = status;
    }
    if (olderThan) {
      filter.createdAt = { $lt: new Date(olderThan) };
    }

    const result = await Subscription.deleteMany(filter);

    return successResponse({
      message: `Deleted ${result.deletedCount} subscription(s)`,
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error('Bulk delete subscriptions error:', error);
    return serverErrorResponse('Failed to delete subscriptions');
  }
}
