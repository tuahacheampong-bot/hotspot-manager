import { NextRequest } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Voucher from '@/models/Voucher';
import { requireAdmin } from '@/lib/auth';
import {
  successResponse,
  serverErrorResponse,
} from '@/lib/api-response';

// GET - List all vouchers (admin only)
export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    const userData = requireAdmin(request);
    if (userData instanceof Response) return userData;

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    const filter: Record<string, unknown> = {};
    if (status && status !== 'all') {
      filter.status = status;
    }

    const vouchers = await Voucher.find(filter)
      .populate('createdBy', 'name')
      .populate('usedBy', 'name phone')
      .sort({ createdAt: -1 })
      .lean();

    return successResponse(vouchers);
  } catch (error) {
    console.error('Get vouchers error:', error);
    return serverErrorResponse('Failed to fetch vouchers');
  }
}
