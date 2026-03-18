import { z } from 'zod';

// ============================================
// Validation Schemas
// ============================================

export const registerSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name is too long'),
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username is too long')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores')
    .optional()
    .or(z.literal('')),
  phone: z
    .string()
    .regex(/^\d{10}$/, 'Phone number must be exactly 10 digits'),
  password: z
    .string()
    .min(4, 'Password must be at least 4 characters'),
});

export const loginSchema = z.object({
  identifier: z.string().min(1, 'Username, phone number, or email is required'),
  password: z.string().min(1, 'Password is required'),
});

export const createHotspotUserSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  profile: z.string().min(1, 'Profile is required'),
});

export const createVoucherSchema = z.object({
  profile: z.string().min(1, 'Profile is required'),
  quantity: z.number().min(1).max(100),
});

export const adminCreateUserSchema = z.object({
  name: z.string().min(2).max(100),
  phone: z.string().regex(/^\+?[1-9]\d{7,14}$/),
  password: z.string().min(8),
  profile: z.string().min(1, 'Profile is required'),
  status: z.enum(['active', 'inactive']).default('inactive'),
});

// ============================================
// Validation Helpers
// ============================================

export function validateInput<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: string[] } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return {
    success: false,
    errors: result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`),
  };
}


