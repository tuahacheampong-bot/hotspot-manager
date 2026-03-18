import { NextRequest } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Plan from '@/models/Plan';
import { getUserFromRequest, requireAdmin } from '@/lib/auth';
import {
  successResponse,
  errorResponse,
  serverErrorResponse,
} from '@/lib/api-response';
import { mtCreateProfile } from '@/lib/mikrotik-service';

// GET - List plans (public: only active, admin: all)
export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    const userData = getUserFromRequest(request);
    const isAdmin = userData?.role === 'admin';

    const filter = isAdmin ? {} : { active: true };
    const plans = await Plan.find(filter).sort({ price: 1 }).lean();

    return successResponse(plans);
  } catch (error) {
    console.error('Get plans error:', error);
    return serverErrorResponse('Failed to fetch plans');
  }
}

// POST - Create a new plan (admin only)
export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    const userData = requireAdmin(request);
    if (userData instanceof Response) return userData;

    const body = await request.json();
    const { planId, name, description, duration, dataLimit, price, currency, features, popular, uptimeLimit, bytesLimit, active } = body;

    if (!planId || !name || !duration || price === undefined) {
      return errorResponse('planId, name, duration, and price are required');
    }

    const existing = await Plan.findOne({ planId });
    if (existing) {
      return errorResponse('A plan with this ID already exists', 409);
    }

    const plan = await Plan.create({
      planId,
      name,
      description: description || '',
      duration,
      dataLimit: dataLimit || 'Unlimited',
      price,
      currency: currency || 'GHS',
      features: features || [],
      popular: popular || false,
      uptimeLimit: uptimeLimit || '0s',
      bytesLimit: bytesLimit || 0,
      active: active !== false,
    });

    // Sync to MikroTik — create profile (respects usermanager/hotspot mode)
    try {
      await mtCreateProfile(planId, uptimeLimit || '0s', bytesLimit || 0);
    } catch (mikrotikError) {
      console.error('MikroTik profile creation error:', mikrotikError);
      // Plan is created in DB but MikroTik sync failed — admin can retry manually
    }

    return successResponse(plan, 201);
  } catch (error) {
    console.error('Create plan error:', error);
    return serverErrorResponse('Failed to create plan');
  }
}
