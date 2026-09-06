'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth, type AuthRole } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { Container } from './Container';
import { NavDropdown } from './NavDropdown';
import { AttendanceWidget } from './AttendanceWidget';

/** Per root CLAUDE.md roles table: HR Manager and every payroll/admin role above it. */
const HR_PAYROLL_ROLES = ['hr_manager', 'hr_payroll_user', 'hr_payroll_manager', 'admin'];
/** HR Payroll User has read-only access to Salary Structures/Rules; HR Manager has none. */
const PAYROLL_CONFIG_ROLES = ['hr_payroll_user', 'hr_payroll_manager', 'admin'];

const ROLE_LABELS: Record<AuthRole, string> = {
  employee: 'Employee',
  hr_manager: 'HR Manager',
  hr_payroll_user: 'HR Payroll User',
  hr_payroll_manager: 'HR Payroll Manager',
  admin: 'Admin',
};

const navLinkClass =
  'shrink-0 whitespace-nowrap rounded-lg px-2 py-1.5 text-sm font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--surface-sunken)] hover:text-[var(--text-link)]';

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
    <header className="sticky top-0 z-30 border-b border-[var(--border-subtle)] bg-[var(--surface-card)]">
      <Container className="flex h-16 items-center gap-6">
        <Link href="/" className="shrink-0 whitespace-nowrap text-lg font-semibold text-[var(--text-primary)]">
          PayOrbit
        </Link>

        {!isLoading && user && pathname !== '/login' && (
          <>
            <nav className="flex shrink-0 items-center gap-1">
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
                  <Link href="/attendance" className={navLinkClass}>
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
              <Link href="/holidays" className={navLinkClass}>
                Holidays
              </Link>
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

            <div className="ml-auto flex shrink-0 items-center gap-3">
              <AttendanceWidget />

              <div className="h-8 w-px shrink-0 bg-[var(--border-subtle)]" aria-hidden="true" />

              {user.role === 'admin' && (
                <Link href="/users" className={navLinkClass}>
                  User Management
                </Link>
              )}

              <div className="flex shrink-0 items-center gap-2.5 pl-1">
                <Avatar name={user.email ?? user.role} size="sm" />
                <div className="hidden flex-col leading-tight sm:flex">
                  <span className="max-w-[180px] truncate text-sm font-semibold text-[var(--text-primary)]" title={user.email}>
                    {user.email ?? 'Unknown user'}
                  </span>
                  <span className="text-xs text-[var(--text-tertiary)]">{ROLE_LABELS[user.role]}</span>
                </div>
              </div>

              <Button variant="outline" size="sm" onClick={handleLogout} className="shrink-0">
                Log out
              </Button>
            </div>
          </>
        )}

        {!isLoading && !user && pathname !== '/login' && (
          <Link href="/login" className="ml-auto shrink-0">
            <Button size="sm">Sign in</Button>
          </Link>
        )}
      </Container>
    </header>
  );
}
