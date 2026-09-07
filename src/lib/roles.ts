export type AppRole = 'rider' | 'driver' | 'admin' | 'superadmin' | 'customer' | 'owner';

/** Legacy customer/owner values remain supported while existing accounts migrate. */
export const riderRoles: AppRole[] = ['rider', 'customer'];
export const adminRoles: AppRole[] = ['admin', 'superadmin', 'owner'];

export function homeForRole(role: AppRole): string {
  if (riderRoles.includes(role)) return '/customer/booking';
  if (role === 'driver') return '/driver/trips';
  return '/owner/dashboard';
}
