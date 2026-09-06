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

/** HR Payroll User has read-only access; only HR Payroll Manager/Admin can create/edit/delete. */
const READ_ROLES: Role[] = ['hr_payroll_user', 'hr_payroll_manager', 'admin'];
const MANAGE_ROLES: Role[] = ['hr_payroll_manager', 'admin'];

interface SalaryStructure {
  id: string;
  name: string;
  active: boolean;
  rulesCount: number;
}

interface Contract {
  employeeId: string;
  salaryStructureId: string | null;
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

export default function SalaryStructuresPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();

  const [structures, setStructures] = useState<SalaryStructure[]>([]);
  const [employeeCounts, setEmployeeCounts] = useState<Map<string, number>>(new Map());
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const canView = !!user && READ_ROLES.includes(user.role);
  const canManage = !!user && MANAGE_ROLES.includes(user.role);

  // Debounce the free-text search before it drives a refetch.
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(timer);
  }, [search]);

  // Search is structures server-side, so its result set (and page count) can change —
  // land back on page 1 rather than risk showing an out-of-range empty page.
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [structuresRes, contractsRes] = await Promise.all([
        api.get<{ data: SalaryStructure[]; meta: PaginationMeta }>('/salary-structures', {
          params: { page, search: debouncedSearch || undefined },
        }),
        api
          .get<{ data: Contract[] }>('/contracts', { params: { limit: 100 } })
          .catch(() => ({ data: { data: [] as Contract[] } })),
      ]);
      setStructures(structuresRes.data.data);
      setMeta(structuresRes.data.meta);

      const counts = new Map<string, Set<string>>();
      for (const c of contractsRes.data.data) {
        if (!c.salaryStructureId) continue;
        if (!counts.has(c.salaryStructureId)) counts.set(c.salaryStructureId, new Set());
        counts.get(c.salaryStructureId)!.add(c.employeeId);
      }
      setEmployeeCounts(new Map(Array.from(counts.entries()).map(([id, set]) => [id, set.size])));
    } catch (err) {
      const axiosErr = err as AxiosError<ApiErrorBody>;
      showToast({
        title: 'Failed to load salary structures',
        description: getErrorMessage(axiosErr.response?.data?.error?.code, axiosErr.response?.data?.error?.message),
        variant: 'danger',
      });
    } finally {
      setIsLoading(false);
    }
  }, [showToast, page, debouncedSearch]);

  useEffect(() => {
    if (canView) loadData();
  }, [canView, loadData]);

  if (authLoading) return null;

  if (!canView) {
    return (
      <Container className="py-10">
        <EmptyState title="Not authorized" description="Salary Structures is only available to payroll roles." />
      </Container>
    );
  }

  return (
    <Container className="flex flex-col gap-6 py-10">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--text-primary)]">Salary Structures</h1>
        <p className="text-xs text-[var(--text-tertiary)]">Catalog of structures</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {canManage && <Button onClick={() => router.push('/salary-structures/new')}>+ New</Button>}

        <div className="flex min-w-[260px] flex-1 items-center gap-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] px-4 py-3">
          <SearchIcon />
          <input
            placeholder="Search structures..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-transparent text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-tertiary)]"
          />
        </div>
      </div>

      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : structures.length === 0 ? (
        <EmptyState title="No salary structures yet" description="Create the first structure to get started." />
      ) : (
        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell>Structure Name</TableHeaderCell>
              <TableHeaderCell>Rules</TableHeaderCell>
              <TableHeaderCell>Employees</TableHeaderCell>
              <TableHeaderCell>Active</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {structures.map((s) => (
              <TableRow key={s.id} className="cursor-pointer" onClick={() => router.push(`/salary-structures/${s.id}`)}>
                <TableCell className="font-medium">{s.name}</TableCell>
                <TableCell className="num">{s.rulesCount}</TableCell>
                <TableCell className="num">{employeeCounts.get(s.id) ?? 0}</TableCell>
                <TableCell>
                  <Badge variant={s.active ? 'success' : 'neutral'} dot>
                    {s.active ? 'Active' : 'Inactive'}
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
