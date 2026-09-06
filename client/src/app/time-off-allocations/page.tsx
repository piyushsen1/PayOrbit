'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AxiosError } from 'axios';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';
import { getErrorMessage } from '@/lib/errorMessages';
import { Container } from '@/components/layout/Container';
import { Badge, type BadgeVariant } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from '@/components/ui/Table';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { Pagination, type PaginationMeta } from '@/components/ui/Pagination';

type Role = 'employee' | 'hr_manager' | 'hr_payroll_user' | 'hr_payroll_manager' | 'admin';

const HR_ROLES: Role[] = ['hr_manager', 'hr_payroll_user', 'hr_payroll_manager', 'admin'];

const STATUS_VARIANT: Record<string, BadgeVariant> = { pending: 'warning', approved: 'success', refused: 'danger' };
const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'refused', label: 'Refused' },
];

interface Employee {
  id: string;
  fullName: string;
}

interface Allocation {
  id: string;
  employee: { id: string; fullName: string } | null;
  timeOffType: { id: string; name: string } | null;
  allocated: string;
  taken: number;
  remaining: number;
  status: 'pending' | 'approved' | 'refused';
}

interface ApiErrorBody {
  error: { code: string; message: string };
}

export default function TimeOffAllocationsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();

  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [employeeFilter, setEmployeeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');

  const isHr = !!user && HR_ROLES.includes(user.role);

  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: Record<string, string | number> = { page };
      if (employeeFilter) params.employeeId = employeeFilter;
      if (statusFilter) params.status = statusFilter;
      if (search) params.search = search;

      const [allocationsRes, employeesRes] = await Promise.all([
        api.get<{ data: Allocation[]; meta: PaginationMeta }>('/time-off-allocations', { params }),
        isHr
          ? api.get<{ data: Employee[] }>('/employees', { params: { limit: 100 } })
          : Promise.resolve({ data: { data: [] as Employee[] } }),
      ]);
      setAllocations(allocationsRes.data.data);
      setMeta(allocationsRes.data.meta);
      setEmployees(employeesRes.data.data);
    } catch (err) {
      const axiosErr = err as AxiosError<ApiErrorBody>;
      showToast({
        title: 'Failed to load time off allocations',
        description: getErrorMessage(axiosErr.response?.data?.error?.code, axiosErr.response?.data?.error?.message),
        variant: 'danger',
      });
    } finally {
      setIsLoading(false);
    }
  }, [employeeFilter, statusFilter, search, isHr, showToast, page]);

  useEffect(() => {
    if (user) loadData();
  }, [user, loadData]);

  if (authLoading) return null;

  if (!user) {
    return (
      <Container className="py-10">
        <EmptyState title="Not authorized" description="Sign in to view time off allocations." />
      </Container>
    );
  }

  return (
    <Container className="flex flex-col gap-6 py-10">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--text-primary)]">Allocations</h1>
        <p className="text-xs text-[var(--text-tertiary)]">Employee leave balances</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {isHr && <Button onClick={() => router.push('/time-off-allocations/new')}>+ New</Button>}
        <Input
          placeholder="Search by employee or type…"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="w-64"
        />
        {isHr && (
          <Select
            placeholder="All employees"
            options={employees.map((e) => ({ value: e.id, label: e.fullName }))}
            value={employeeFilter}
            onChange={(e) => {
              setEmployeeFilter(e.target.value);
              setPage(1);
            }}
            className="w-56"
          />
        )}
        <Select
          placeholder="All statuses"
          options={STATUS_OPTIONS}
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="w-44"
        />
      </div>

      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : allocations.length === 0 ? (
        <EmptyState title="No allocations yet" description="Grant the first leave balance to get started." />
      ) : (
        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell>Employee</TableHeaderCell>
              <TableHeaderCell>Type</TableHeaderCell>
              <TableHeaderCell>Allocated</TableHeaderCell>
              <TableHeaderCell>Taken</TableHeaderCell>
              <TableHeaderCell>Remaining</TableHeaderCell>
              <TableHeaderCell>Status</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {allocations.map((a) => (
              <TableRow key={a.id} className="cursor-pointer" onClick={() => router.push(`/time-off-allocations/${a.id}`)}>
                <TableCell className="font-medium">{a.employee?.fullName ?? '—'}</TableCell>
                <TableCell>{a.timeOffType?.name ?? '—'}</TableCell>
                <TableCell className="num">{a.allocated}</TableCell>
                <TableCell className="num">{a.taken}</TableCell>
                <TableCell className="num">{a.remaining}</TableCell>
                <TableCell>
                  <Badge variant={STATUS_VARIANT[a.status]} dot>
                    {a.status[0].toUpperCase() + a.status.slice(1)}
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
