import { NextRequest } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { verifyPassword, signToken, getUserFromRequest } from '@/lib/auth';
import { successResponse, errorResponse, serverErrorResponse } from '@/lib/api-response';

function detectIdentifierType(input: string): 'phone' | 'email' | 'username' {
  // Phone: starts with + or all digits, 8-16 chars
  if (/^\+?\d{8,16}$/.test(input)) return 'phone';
  // Email: contains @
  if (input.includes('@')) return 'email';
  // Otherwise treat as username
  return 'username';
}

export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    const body = await request.json();
    const { identifier, password } = body;

    if (!identifier || !password) {
      return errorResponse('Username, phone number, or email and password are required');
    }

    const trimmed = identifier.trim();
    const idType = detectIdentifierType(trimmed);

    // Build query based on detected type
    let query: Record<string, string>;
    switch (idType) {
      case 'phone':
        query = { phone: trimmed };
        break;
      case 'email':
        query = { email: trimmed.toLowerCase() };
        break;
      case 'username':
      default:
        query = { username: trimmed.toLowerCase() };
        break;
    }

    // Find user with password field
    const user = await User.findOne(query).select('+password');
    if (!user) {
      return errorResponse('Invalid credentials', 401);
    }

    // Verify password
    const isValid = await verifyPassword(password, user.password);
    if (!isValid) {
      return errorResponse('Invalid credentials', 401);
    }

    // Generate JWT
    const token = signToken({
      sub: user._id.toString(),
      role: user.role,
      phone: user.phone,
    });

    const response = successResponse({
      user: {
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
      },
      token,
    });

    response.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return serverErrorResponse('Login failed');
  }
}

// GET - Get current user from token
export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    const userData = getUserFromRequest(request);
    if (!userData) {
      return errorResponse('Unauthorized', 401);
    }

    const user = await User.findById(userData.id);
    if (!user) {
      return errorResponse('User not found', 404);
    }

    return successResponse({
      user: {
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
      },
    });
  } catch (error) {
    console.error('Get user error:', error);
    return serverErrorResponse('Failed to get user');
  }
}
