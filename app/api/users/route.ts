import { NextRequest } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { hashPassword, requireAdmin } from '@/lib/auth';
import { validateInput, adminCreateUserSchema } from '@/lib/validation';
import {
  successResponse,
  errorResponse,
  serverErrorResponse,
} from '@/lib/api-response';
import { mtCreateUser } from '@/lib/mikrotik-service';
import { parseDurationToMs } from '@/lib/utils';
import Plan from '@/models/Plan';

// GET - List all users (admin only)
export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    const currentUser = requireAdmin(request);
    if (currentUser instanceof Response) return currentUser;

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    const filter: Record<string, unknown> = {};
    if (status && status !== 'all') {
      filter.status = status;
    }

    const users = await User.find(filter)
      .select('-password -hotspotPassword')
      .sort({ createdAt: -1 })
      .lean();

    return successResponse(users);
  } catch (error) {
    console.error('Get users error:', error);
    return serverErrorResponse('Failed to fetch users');
  }
}

// POST - Create a new hotspot user (admin only)
export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    const currentUser = requireAdmin(request);
    if (currentUser instanceof Response) return currentUser;

    const body = await request.json();
    const validation = validateInput(adminCreateUserSchema, body);

    if (!validation.success) {
      return errorResponse(validation.errors.join(', '));
    }

    const { name, phone, password, profile, status } = validation.data;

    // Check if user exists
    const existingUser = await User.findOne({ phone });
    if (existingUser) {
      return errorResponse('A user with this phone number already exists', 409);
    }

    const hashedPassword = await hashPassword(password);

    // Get plan from database for correct limits (not hardcoded config)
    const plan = await Plan.findOne({ planId: profile, active: true });
    if (!plan) {
      return errorResponse('Plan not found or inactive', 404);
    }
    const uptimeLimit = plan.uptimeLimit || '0s';
    const bytesLimit = plan.bytesLimit || 0;

    const now = new Date();
    const expiresAt = new Date(now.getTime() + parseDurationToMs(uptimeLimit));

    // Create user in database — store plain password in hotspotPassword for MikroTik
    const user = await User.create({
      name,
      phone,
      password: hashedPassword,
      hotspotPassword: password,
      role: 'user',
      hotspotUsername: phone.replace(/[^0-9]/g, ''),
      hotspotProfile: profile,
      status,
      activatedAt: status === 'active' ? now : undefined,
      expiresAt: status === 'active' ? expiresAt : undefined,
    });

    // If active, create hotspot user on MikroTik
    if (status === 'active') {
      try {
        await Promise.race([
          mtCreateUser(user.hotspotUsername!, password, profile, uptimeLimit, bytesLimit),
          new Promise((_, reject) => setTimeout(() => reject(new Error('MikroTik timeout')), 5000)),
        ]);
      } catch (mikrotikError) {
        console.error('MikroTik error:', mikrotikError);
      }
    }

    return successResponse(
      {
        id: user._id,
        name: user.name,
        phone: user.phone,
        hotspotUsername: user.hotspotUsername,
        status: user.status,
      },
      201
    );
  } catch (error) {
    console.error('Create user error:', error);
    return serverErrorResponse('Failed to create user');
  }
}


