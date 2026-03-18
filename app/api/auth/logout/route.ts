import { successResponse } from '@/lib/api-response';

export async function POST() {
  // With JWT-based auth stored in cookies, logout is handled client-side
  // by clearing the cookie. This endpoint exists for API completeness.
  return successResponse({ message: 'Logged out successfully' });
}
