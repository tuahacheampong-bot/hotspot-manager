import { NextRequest } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Plan from '@/models/Plan';
import { requireAdmin } from '@/lib/auth';
import {
  successResponse,
  errorResponse,
  notFoundResponse,
  serverErrorResponse,
} from '@/lib/api-response';
import { mtUpdateProfile, mtRemoveProfile } from '@/lib/mikrotik-service';

// PATCH - Update a plan (admin only)
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

    const plan = await Plan.findById(id);
    if (!plan) return notFoundResponse('Plan not found');

    // Update allowed fields
    const allowedFields = ['name', 'description', 'duration', 'dataLimit', 'price', 'currency', 'features', 'popular', 'uptimeLimit', 'bytesLimit', 'active'];
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        (plan as unknown as Record<string, unknown>)[field] = body[field];
      }
    }

    await plan.save();

    // Sync to MikroTik — update hotspot user profile
    try {
      await mtUpdateProfile(plan.planId, plan.uptimeLimit, plan.bytesLimit);
    } catch (mikrotikError) {
      console.error('MikroTik profile update error:', mikrotikError);
    }

    return successResponse(plan);
  } catch (error) {
    console.error('Update plan error:', error);
    return serverErrorResponse('Failed to update plan');
  }
}

// DELETE - Remove a plan (admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect();

    const userData = requireAdmin(request);
    if (userData instanceof Response) return userData;

    const { id } = params;
    const plan = await Plan.findById(id);
    if (!plan) return notFoundResponse('Plan not found');

    // Remove from MikroTik first
    try {
      await mtRemoveProfile(plan.planId);
    } catch (mikrotikError) {
      console.error('MikroTik profile removal error:', mikrotikError);
    }

    await Plan.findByIdAndDelete(id);

    return successResponse({ message: 'Plan deleted successfully' });
  } catch (error) {
    console.error('Delete plan error:', error);
    return serverErrorResponse('Failed to delete plan');
  }
}
