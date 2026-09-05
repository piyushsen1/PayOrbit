'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
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

const TIME_OFF_TYPE_MODULE_ROLES: Role[] = ['hr_manager', 'hr_payroll_user', 'hr_payroll_manager', 'admin'];

const ROLE_LABELS: Record<string, string> = {
  hr_manager: 'HR Manager',
  hr_payroll_user: 'HR Payroll User',
  hr_payroll_manager: 'HR Payroll Manager',
  admin: 'Admin',
};

interface TimeOffType {
  id: string;
  name: string;
  unit: 'days' | 'hours';
  allocationRequired: boolean;
  approvalRole: string;
  status: 'active' | 'inactive';
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

export default function TimeOffTypesPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();

  const [types, setTypes] = useState<TimeOffType[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');

  const canAccess = !!user && TIME_OFF_TYPE_MODULE_ROLES.includes(user.role);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data } = await api.get<{ data: TimeOffType[]; meta: PaginationMeta }>('/time-off-types', {
        params: { page },
      });
      setTypes(data.data);
      setMeta(data.meta);
    } catch (err) {
      const axiosErr = err as AxiosError<ApiErrorBody>;
      showToast({
        title: 'Failed to load time off types',
        description: getErrorMessage(axiosErr.response?.data?.error?.code, axiosErr.response?.data?.error?.message),
        variant: 'danger',
      });
    } finally {
      setIsLoading(false);
    }
  }, [showToast, page]);

  useEffect(() => {
    if (canAccess) loadData();
  }, [canAccess, loadData]);

  const filtered = useMemo(() => {
    if (!search) return types;
    const needle = search.toLowerCase();
    return types.filter((t) => t.name.toLowerCase().includes(needle));
  }, [types, search]);

  if (authLoading) return null;

  if (!canAccess) {
    return (
      <Container className="py-10">
        <EmptyState title="Not authorized" description="Time Off Types is only available to HR and payroll roles." />
      </Container>
    );
  }

  return (
    <Container className="flex flex-col gap-6 py-10">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--text-primary)]">Time Off Types</h1>
        <p className="text-xs text-[var(--text-tertiary)]">Leave policy catalog</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={() => router.push('/time-off-types/new')}>+ New</Button>

        <div className="flex min-w-[260px] flex-1 items-center gap-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] px-4 py-3">
          <SearchIcon />
          <input
            placeholder="Search time off types..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-transparent text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-tertiary)]"
          />
        </div>
      </div>

      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : filtered.length === 0 ? (
        <EmptyState title="No time off types yet" description="Create the first leave policy to get started." />
      ) : (
        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell>Type</TableHeaderCell>
              <TableHeaderCell>Unit</TableHeaderCell>
              <TableHeaderCell>Allocation</TableHeaderCell>
              <TableHeaderCell>Approval</TableHeaderCell>
              <TableHeaderCell>Status</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.map((t) => (
              <TableRow key={t.id} className="cursor-pointer" onClick={() => router.push(`/time-off-types/${t.id}`)}>
                <TableCell className="font-medium">{t.name}</TableCell>
                <TableCell>{t.unit === 'days' ? 'Days' : 'Hours'}</TableCell>
                <TableCell>{t.allocationRequired ? 'Required' : 'Not required'}</TableCell>
                <TableCell>{ROLE_LABELS[t.approvalRole] ?? t.approvalRole}</TableCell>
                <TableCell>
                  <Badge variant={t.status === 'active' ? 'success' : 'neutral'} dot>
                    {t.status === 'active' ? 'Active' : 'Inactive'}
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
