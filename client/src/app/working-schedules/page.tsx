'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AxiosError } from 'axios';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';
import { getErrorMessage } from '@/lib/errorMessages';
import { Container } from '@/components/layout/Container';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from '@/components/ui/Table';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { Pagination, type PaginationMeta } from '@/components/ui/Pagination';

type Role = 'employee' | 'hr_manager' | 'hr_payroll_user' | 'hr_payroll_manager' | 'admin';

const WORKING_SCHEDULE_MODULE_ROLES: Role[] = ['hr_manager', 'hr_payroll_user', 'hr_payroll_manager', 'admin'];

interface WorkingSchedule {
  id: string;
  name: string;
  company: string;
  status: 'active' | 'inactive';
  weeklyHours: string;
  daysPerWeek: number;
}

interface ApiErrorBody {
  error: { code: string; message: string };
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4 shrink-0 text-[var(--text-tertiary)]">
      <circle cx="9" cy="9" r="6" />
      <path d="M17 17l-4-4" strokeLinecap="round" />
    </svg>
  );
}

export default function WorkingSchedulesPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();

  const [schedules, setSchedules] = useState<WorkingSchedule[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const canAccess = !!user && WORKING_SCHEDULE_MODULE_ROLES.includes(user.role);

  // Debounce the free-text search before it drives a refetch.
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(timer);
  }, [search]);

  // Search is schedules server-side, so its result set (and page count) can change —
  // land back on page 1 rather than risk showing an out-of-range empty page.
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data } = await api.get<{ data: WorkingSchedule[]; meta: PaginationMeta }>('/working-schedules', {
        params: { page, search: debouncedSearch || undefined },
      });
      setSchedules(data.data);
      setMeta(data.meta);
    } catch (err) {
      const axiosErr = err as AxiosError<ApiErrorBody>;
      showToast({
        title: 'Failed to load working schedules',
        description: getErrorMessage(axiosErr.response?.data?.error?.code, axiosErr.response?.data?.error?.message),
        variant: 'danger',
      });
    } finally {
      setIsLoading(false);
    }
  }, [showToast, page, debouncedSearch]);

  useEffect(() => {
    if (canAccess) loadData();
  }, [canAccess, loadData]);

  if (authLoading) return null;

  if (!canAccess) {
    return (
      <Container className="py-10">
        <EmptyState title="Not authorized" description="Working Schedules is only available to HR and payroll roles." />
      </Container>
    );
  }

  return (
    <Container className="flex flex-col gap-6 py-10">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--text-primary)]">Working Schedules</h1>
        <p className="text-xs text-[var(--text-tertiary)]">Manage weekly patterns</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={() => router.push('/working-schedules/new')}>+ New Schedule</Button>

        <div className="flex min-w-[260px] flex-1 items-center gap-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] px-4 py-3">
          <SearchIcon />
          <input
            placeholder="Search working schedules..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-transparent text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-tertiary)]"
          />
        </div>
      </div>

      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : schedules.length === 0 ? (
        <EmptyState title="No working schedules yet" description="Create the first weekly pattern to get started." />
      ) : (
        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell>Schedule Name</TableHeaderCell>
              <TableHeaderCell>Days/Week</TableHeaderCell>
              <TableHeaderCell>Hours/Week</TableHeaderCell>
              <TableHeaderCell>Company</TableHeaderCell>
              <TableHeaderCell>Status</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {schedules.map((s) => (
              <TableRow key={s.id} className="cursor-pointer" onClick={() => router.push(`/working-schedules/${s.id}`)}>
                <TableCell className="font-medium">{s.name}</TableCell>
                <TableCell className="num">{s.daysPerWeek}</TableCell>
                <TableCell className="num">{s.weeklyHours}</TableCell>
                <TableCell>{s.company}</TableCell>
                <TableCell>
                  <Badge variant={s.status === 'active' ? 'success' : 'neutral'} dot>
                    {s.status === 'active' ? 'Active' : 'Inactive'}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {meta && <Pagination meta={meta} onPageChange={setPage} />}
    </Container>
  );
}
