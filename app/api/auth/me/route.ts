import { NextRequest } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { getUserFromRequest } from '@/lib/auth';
import { successResponse, unauthorizedResponse, serverErrorResponse } from '@/lib/api-response';

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    const userData = getUserFromRequest(request);
    if (!userData) return unauthorizedResponse();
    const user = await User.findById(userData.id).select('-password -hotspotPassword');
    if (!user) return unauthorizedResponse();
    return successResponse({
      id: user._id,
      name: user.name,
      username: user.username,
      phone: user.phone,
      email: user.email,
      role: user.role,
      status: user.status,
      hotspotUsername: user.hotspotUsername,
      hotspotProfile: user.hotspotProfile,
      activatedAt: user.activatedAt,
      expiresAt: user.expiresAt,
    });
  } catch (error) {
    console.error('Get user error:', error);
    return serverErrorResponse('Failed to get user');
  }
}
