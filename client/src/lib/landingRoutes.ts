import type { AuthRole } from '@/hooks/useAuth';

/** Where each role lands after sign-in — its most central screen. Shared by the
 * login page (navigates here directly) and `/` (fallback for a direct visit
 * while already signed in, e.g. clicking the logo). */
export const LANDING_ROUTE_BY_ROLE: Record<AuthRole, string> = {
  admin: '/users',
  hr_payroll_manager: '/dashboard',
  hr_payroll_user: '/dashboard',
  hr_manager: '/employees',
  employee: '/time-off-requests',
};

export function getLandingRoute(role: AuthRole): string {
  return LANDING_ROUTE_BY_ROLE[role] ?? '/time-off-requests';
}
