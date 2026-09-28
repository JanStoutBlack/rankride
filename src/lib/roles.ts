export type AppRole = 'rider' | 'driver' | 'admin' | 'superadmin';

export const riderRoles: AppRole[] = ['rider'];
export const adminRoles: AppRole[] = ['admin', 'superadmin'];

export function homeForRole(role: AppRole): string {
  if (role === 'rider') return '/customer/booking';
  if (role === 'driver') return '/driver/trips';
  return '/admin/dashboard';
}
