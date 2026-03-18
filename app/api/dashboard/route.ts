import { NextRequest } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import Voucher from '@/models/Voucher';
import { requireAdmin } from '@/lib/auth';
import {
  successResponse,
  serverErrorResponse,
} from '@/lib/api-response';
import { mtGetActiveSessions, mtGetUsers } from '@/lib/mikrotik-service';

// GET - Dashboard statistics (admin only)
export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    const userData = requireAdmin(request);
    if (userData instanceof Response) return userData;

    // Database stats
    const [
      totalUsers,
      activeUsers,
      inactiveUsers,
      expiredUsers,
      suspendedUsers,
      totalVouchers,
      unusedVouchers,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ status: 'active' }),
      User.countDocuments({ status: 'inactive' }),
      User.countDocuments({ status: 'expired' }),
      User.countDocuments({ status: 'suspended' }),
      Voucher.countDocuments(),
      Voucher.countDocuments({ status: 'unused' }),
    ]);

    // MikroTik live stats
    let hotspotActive: Record<string, unknown>[] = [];
    let hotspotTotalUsers = 0;
    try {
      const [active, users] = await Promise.all([
        mtGetActiveSessions(),
        mtGetUsers(),
      ]);
      hotspotActive = active;
      hotspotTotalUsers = users.length;
    } catch {
      // MikroTik unavailable
    }

    return successResponse({
      users: {
        total: totalUsers,
        active: activeUsers,
        inactive: inactiveUsers,
        expired: expiredUsers,
        suspended: suspendedUsers,
      },
      hotspot: {
        currentlyActive: hotspotActive.length,
        totalCreated: hotspotTotalUsers,
      },
      vouchers: {
        total: totalVouchers,
        unused: unusedVouchers,
      },
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    return serverErrorResponse('Failed to fetch dashboard data');
  }
}
