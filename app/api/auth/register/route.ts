import { NextRequest } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { hashPassword, signToken } from '@/lib/auth';
import { validateInput, registerSchema } from '@/lib/validation';
import { successResponse, errorResponse, serverErrorResponse } from '@/lib/api-response';
import { mtCreateUser } from '@/lib/mikrotik-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = validateInput(registerSchema, body);

    if (!validation.success) {
      return errorResponse(validation.errors.join(', '), 400);
    }

    const { name, username, phone, password } = validation.data;

    await dbConnect();

    // Check for existing phone / username
    const [existingPhone, existingUsername] = await Promise.all([
      User.findOne({ phone }),
      username ? User.findOne({ username: username.toLowerCase() }) : null,
    ]);

    if (existingPhone) {
      return errorResponse('A user with this phone number already exists', 409);
    }
    if (existingUsername) {
      return errorResponse('This username is already taken', 409);
    }

    // Hash password and create user
    const hashedPassword = await hashPassword(password);
    const hotspotUsername = username ? username.toLowerCase() : phone;

    const user = await User.create({
      name,
      username: username ? username.toLowerCase() : undefined,
      phone,
      password: hashedPassword,
      hotspotPassword: password,
      hotspotUsername,
      role: 'user',
      status: 'inactive',
    });

    // Create MikroTik account with no profile (disabled until plan is selected)
    // Wrapped in timeout so registration doesn't hang if MikroTik is unreachable
    try {
      await Promise.race([
        mtCreateUser(hotspotUsername, password),
        new Promise((_, reject) => setTimeout(() => reject(new Error('MikroTik timeout')), 3000)),
      ]);
    } catch (mikrotikError) {
      console.error('MikroTik account creation error:', mikrotikError);
    }

    // Generate JWT token
    const token = signToken({
      sub: user._id.toString(),
      role: user.role,
    });

    const userData = {
      _id: user._id,
      name: user.name,
      username: user.username,
      phone: user.phone,
      role: user.role,
      status: user.status,
    };

    const response = successResponse({ user: userData, token }, 201);
    response.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Register error:', error);
    return serverErrorResponse('Failed to register user');
  }
}
