'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AxiosError } from 'axios';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';
import { getErrorMessage } from '@/lib/errorMessages';
import { Container } from '@/components/layout/Container';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from '@/components/ui/Table';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';

type Role = 'employee' | 'hr_manager' | 'hr_payroll_user' | 'hr_payroll_manager' | 'admin';
type Status = 'active' | 'inactive';

interface Employee {
  id: string;
  fullName: string;
  workEmail: string;
  jobPosition: string | null;
  department: string | null;
  status: Status;
}

interface ApiErrorBody {
  error: { code: string; message: string };
}

/** Per root CLAUDE.md roles table: HR Manager and every payroll/admin role above it. */
const EMPLOYEE_MODULE_ROLES: Role[] = ['hr_manager', 'hr_payroll_user', 'hr_payroll_manager', 'admin'];

type ViewMode = 'kanban' | 'list';

function SearchIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4 shrink-0 text-[var(--text-tertiary)]">
      <circle cx="9" cy="9" r="6" />
      <path d="M17 17l-4-4" strokeLinecap="round" />
    </svg>
  );
}

export default function EmployeesPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [view, setView] = useState<ViewMode>('kanban');

  const canView = !!user && EMPLOYEE_MODULE_ROLES.includes(user.role);

  const loadEmployees = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data } = await api.get<{ data: Employee[] }>('/employees');
      setEmployees(data.data);
    } catch (err) {
      const axiosErr = err as AxiosError<ApiErrorBody>;
      showToast({
        title: 'Failed to load employees',
        description: getErrorMessage(axiosErr.response?.data?.error?.code, axiosErr.response?.data?.error?.message),
        variant: 'danger',
      });
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    if (canView) loadEmployees();
  }, [canView, loadEmployees]);

  const filteredEmployees = useMemo(() => {
    if (!search) return employees;
    const needle = search.toLowerCase();
    return employees.filter((e) =>
      `${e.fullName} ${e.workEmail} ${e.jobPosition ?? ''} ${e.department ?? ''}`.toLowerCase().includes(needle)
    );
  }, [employees, search]);

  if (authLoading) {
    return (
      <Container className="flex flex-col gap-3 py-10">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </Container>
    );
  }

  if (!canView) {
    return (
      <Container className="py-10">
        <EmptyState title="Not authorized" description="Employees is only available to HR and payroll roles." />
      </Container>
    );
  }

  return (
    <Container className="flex flex-col gap-6 py-10">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--text-primary)]">Employees</h1>
        <p className="text-xs text-[var(--text-tertiary)]">Default view: {view === 'kanban' ? 'Kanban' : 'List'}</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={() => router.push('/employees/new')}>+ New</Button>

        <div className="flex min-w-[260px] flex-1 items-center gap-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] px-4 py-3">
          <SearchIcon />
          <input
            placeholder="Search employees..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-transparent text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-tertiary)]"
          />
        </div>

        <div className="flex gap-1 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-1">
          <Button
            type="button"
            variant={view === 'kanban' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setView('kanban')}
          >
            Kanban
          </Button>
          <Button type="button" variant={view === 'list' ? 'secondary' : 'ghost'} size="sm" onClick={() => setView('list')}>
            List
          </Button>
        </div>
      </div>

      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : filteredEmployees.length === 0 ? (
        <EmptyState title="No employees yet" description="Create the first employee record to get started." />
      ) : view === 'kanban' ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredEmployees.map((e) => (
            <Card
              key={e.id}
              className="cursor-pointer p-5 shadow-glow-xs transition hover:shadow-glow-sm"
              onClick={() => router.push(`/employees/${e.id}`)}
            >
              <div className="flex items-start gap-3">
                <Avatar name={e.fullName} />
                <div>
                  <p className="text-sm font-semibold text-[var(--text-primary)]">{e.fullName}</p>
                  <p className="text-xs text-[var(--text-tertiary)]">{e.jobPosition ?? '—'}</p>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-xs text-[var(--text-tertiary)]">{e.department ?? '—'}</span>
                <Badge variant={e.status === 'active' ? 'success' : 'neutral'} dot>
                  {e.status === 'active' ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell>Employee</TableHeaderCell>
              <TableHeaderCell>Work Email</TableHeaderCell>
              <TableHeaderCell>Job Position</TableHeaderCell>
              <TableHeaderCell>Department</TableHeaderCell>
              <TableHeaderCell>Status</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredEmployees.map((e) => (
              <TableRow key={e.id} className="cursor-pointer" onClick={() => router.push(`/employees/${e.id}`)}>
                <TableCell className="font-medium">{e.fullName}</TableCell>
                <TableCell>{e.workEmail}</TableCell>
                <TableCell>{e.jobPosition ?? '—'}</TableCell>
                <TableCell>{e.department ?? '—'}</TableCell>
                <TableCell>
                  <Badge variant={e.status === 'active' ? 'success' : 'neutral'} dot>
                    {e.status === 'active' ? 'Active' : 'Inactive'}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Container>
  );
}
