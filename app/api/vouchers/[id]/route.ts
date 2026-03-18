import { NextRequest } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Voucher from '@/models/Voucher';
import { requireAdmin } from '@/lib/auth';
import {
  successResponse,
  notFoundResponse,
  serverErrorResponse,
} from '@/lib/api-response';

// DELETE - Remove a voucher (admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect();

    const currentUser = requireAdmin(request);
    if (currentUser instanceof Response) return currentUser;

    const { id } = params;
    const voucher = await Voucher.findById(id);
    if (!voucher) return notFoundResponse('Voucher not found');

    await Voucher.findByIdAndDelete(id);

    return successResponse({ message: 'Voucher deleted successfully' });
  } catch (error) {
    console.error('Delete voucher error:', error);
    return serverErrorResponse('Failed to delete voucher');
  }
}
