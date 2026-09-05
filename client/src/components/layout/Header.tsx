'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';
import { Container } from './Container';
import { NavDropdown } from './NavDropdown';
import { AttendanceWidget } from './AttendanceWidget';

/** Per root CLAUDE.md roles table: HR Manager and every payroll/admin role above it. */
const HR_PAYROLL_ROLES = ['hr_manager', 'hr_payroll_user', 'hr_payroll_manager', 'admin'];
/** HR Payroll User has read-only access to Salary Structures/Rules; HR Manager has none. */
const PAYROLL_CONFIG_ROLES = ['hr_payroll_user', 'hr_payroll_manager', 'admin'];

export function Header() {
  const { user, isLoading, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const hasHrAccess = !!user && HR_PAYROLL_ROLES.includes(user.role);
  const hasPayrollConfigAccess = !!user && PAYROLL_CONFIG_ROLES.includes(user.role);

  function handleLogout() {
    logout();
    router.push('/login');
  }

  return (
    <header className="border-b border-[var(--border-subtle)] bg-[var(--surface-card)]">
      <Container className="flex h-16 items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-lg font-semibold text-[var(--text-primary)]">
            PayOrbit
          </Link>
          {!isLoading && user && (
            <nav className="flex items-center gap-5">
              {hasHrAccess && (
                <>
                  <NavDropdown
                    label="Employees"
                    items={[
                      { href: '/employees', label: 'Employees' },
                      { href: '/contracts', label: 'Contracts' },
                      { href: '/working-schedules', label: 'Working Schedules' },
                    ]}
                  />
                  <Link
                    href="/attendance"
                    className="text-sm font-semibold text-[var(--text-secondary)] hover:text-[var(--text-link)]"
                  >
                    Attendance
                  </Link>
                </>
              )}
              <NavDropdown
                label="Time Off"
                items={[
                  ...(hasHrAccess ? [{ href: '/time-off-types', label: 'Time Off Types' }] : []),
                  { href: '/time-off-allocations', label: 'Allocations' },
                  { href: '/time-off-requests', label: 'Time Offs' },
                ]}
              />
              {hasPayrollConfigAccess && (
                <NavDropdown
                  label="Payroll"
                  items={[
                    { href: '/dashboard', label: 'Dashboard' },
                    { href: '/pay-runs', label: 'Pay Runs' },
                    { href: '/payslips', label: 'Payslips' },
                    { href: '/salary-structures', label: 'Salary Structures' },
                    { href: '/salary-rules', label: 'Salary Rules' },
                  ]}
                />
              )}
            </nav>
          )}
        </div>
        <div className="flex items-center gap-4">
          {!isLoading && user && <AttendanceWidget />}
          {!isLoading && user && (
            <>
              {user.role === 'admin' && (
                <Link
                  href="/users"
                  className="text-sm font-semibold text-[var(--text-link)] hover:text-[var(--primary-hover)] hover:underline"
                >
                  User Management
                </Link>
              )}
              <span className="text-sm text-[var(--text-tertiary)]">{user.email ?? user.id}</span>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                Log out
              </Button>
            </>
          )}
          {!isLoading && !user && pathname !== '/login' && (
            <Link href="/login">
              <Button size="sm">Sign in</Button>
            </Link>
          )}
        </div>
      </Container>
    </header>
  );
}
