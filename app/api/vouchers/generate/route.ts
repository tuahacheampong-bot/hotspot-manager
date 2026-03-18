import { NextRequest } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Voucher from '@/models/Voucher';
import { requireAdmin } from '@/lib/auth';
import { validateInput, createVoucherSchema } from '@/lib/validation';
import { generateVoucherCode } from '@/lib/utils';
import {
  successResponse,
  errorResponse,
  serverErrorResponse,
} from '@/lib/api-response';

// POST - Generate voucher codes (admin only)
export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    const userData = requireAdmin(request);
    if (userData instanceof Response) return userData;

    const body = await request.json();
    const validation = validateInput(createVoucherSchema, body);

    if (!validation.success) {
      return errorResponse(validation.errors.join(', '));
    }

    const { profile, quantity } = validation.data;

    // Pre-generate unique codes
    const existingCodes = new Set(
      (await Voucher.find({}, { code: 1 }).lean()).map((v) => v.code)
    );

    const codes: string[] = [];
    while (codes.length < quantity) {
      const code = generateVoucherCode();
      if (!existingCodes.has(code) && !codes.includes(code)) {
        codes.push(code);
      }
    }

    // Batch insert
    const docs = codes.map((code) => ({
      code,
      profile,
      createdBy: userData.id,
    }));

    const created = await Voucher.insertMany(docs);

    const vouchers = created.map((v) => ({
      id: v._id,
      code: v.code,
      profile: v.profile,
      status: v.status,
    }));

    return successResponse({
      message: `${quantity} voucher(s) generated successfully`,
      vouchers,
    }, 201);
  } catch (error) {
    console.error('Generate vouchers error:', error);
    return serverErrorResponse('Failed to generate vouchers');
  }
}
