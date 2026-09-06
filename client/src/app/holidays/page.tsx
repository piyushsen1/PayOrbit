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
import { Input } from '@/components/ui/Input';
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from '@/components/ui/Table';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';

type Role = 'employee' | 'hr_manager' | 'hr_payroll_user' | 'hr_payroll_manager' | 'admin';

const MANAGE_ROLES: Role[] = ['hr_manager', 'hr_payroll_user', 'hr_payroll_manager', 'admin'];

interface Holiday {
  id: string;
  name: string;
  date: string;
  recurring: boolean;
  notes: string | null;
}

interface ApiErrorBody {
  error: { code: string; message: string };
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function isUpcoming(iso: string): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(iso) >= today;
}

export default function HolidaysPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();

  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');

  const canManage = !!user && MANAGE_ROLES.includes(user.role);

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: Record<string, string | number> = { limit: 100, year: new Date().getFullYear() };
      if (search) params.search = search;
      const { data } = await api.get<{ data: Holiday[] }>('/holidays', { params });
      setHolidays(data.data);
    } catch (err) {
      const axiosErr = err as AxiosError<ApiErrorBody>;
      showToast({
        title: 'Failed to load holidays',
        description: getErrorMessage(axiosErr.response?.data?.error?.code, axiosErr.response?.data?.error?.message),
        variant: 'danger',
      });
    } finally {
      setIsLoading(false);
    }
  }, [search, showToast]);

  useEffect(() => {
    if (user) loadData();
  }, [user, loadData]);

  const sorted = useMemo(() => [...holidays].sort((a, b) => a.date.localeCompare(b.date)), [holidays]);

  if (authLoading) return null;

  if (!user) {
    return (
      <Container className="py-10">
        <EmptyState title="Not authorized" description="Sign in to view the holiday calendar." />
      </Container>
    );
  }

  return (
    <Container className="flex flex-col gap-6 py-10">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--text-primary)]">Holidays</h1>
          <p className="text-xs text-[var(--text-tertiary)]">Company holiday calendar for {new Date().getFullYear()}</p>
        </div>
        {canManage && <Button onClick={() => router.push('/holidays/new')}>+ New Holiday</Button>}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="Search by holiday name…"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="w-64"
        />
      </div>

      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : sorted.length === 0 ? (
        <EmptyState title="No holidays yet" description="Add the first company holiday to get started." />
      ) : (
        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell>Date</TableHeaderCell>
              <TableHeaderCell>Holiday</TableHeaderCell>
              <TableHeaderCell>Notes</TableHeaderCell>
              <TableHeaderCell>Status</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sorted.map((h) => (
              <TableRow
                key={h.id}
                className={canManage ? 'cursor-pointer' : ''}
                onClick={() => canManage && router.push(`/holidays/${h.id}`)}
              >
                <TableCell className="num font-medium">{formatDate(h.date)}</TableCell>
                <TableCell>
                  {h.name} {h.recurring && <Badge variant="info">Yearly</Badge>}
                </TableCell>
                <TableCell className="text-[var(--text-tertiary)]">{h.notes ?? '—'}</TableCell>
                <TableCell>
                  <Badge variant={isUpcoming(h.date) ? 'success' : 'neutral'} dot>
                    {isUpcoming(h.date) ? 'Upcoming' : 'Past'}
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
