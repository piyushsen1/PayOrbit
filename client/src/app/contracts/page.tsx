'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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

type Role = 'employee' | 'hr_manager' | 'hr_payroll_user' | 'hr_payroll_manager' | 'admin';

const CONTRACTS_MODULE_ROLES: Role[] = ['hr_manager', 'hr_payroll_user', 'hr_payroll_manager', 'admin'];

interface Employee {
  id: string;
  fullName: string;
}

interface Contract {
  id: string;
  contractNumber: string;
  employeeId: string;
  startDate: string;
  endDate: string | null;
  wagePerMonth: string;
  status: 'running' | 'expired';
}

interface ApiErrorBody {
  error: { code: string; message: string };
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' });
}

function formatWage(amount: string): string {
  return `₹${Number(amount).toLocaleString('en-IN')}`;
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4 shrink-0 text-[var(--text-tertiary)]">
      <circle cx="9" cy="9" r="6" />
      <path d="M17 17l-4-4" strokeLinecap="round" />
    </svg>
  );
}

export default function ContractsPage() {
  return (
    <Suspense
      fallback={
        <Container className="flex flex-col gap-3 py-10">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-64 w-full" />
        </Container>
      }
    >
      <ContractsPageContent />
    </Suspense>
  );
}

function ContractsPageContent() {
  const { user, isLoading: authLoading } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const employeeIdFilter = searchParams.get('employeeId') ?? undefined;

  const [contracts, setContracts] = useState<Contract[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');

  const canAccess = !!user && CONTRACTS_MODULE_ROLES.includes(user.role);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [contractsRes, employeesRes] = await Promise.all([
        api.get<{ data: Contract[] }>('/contracts', { params: employeeIdFilter ? { employeeId: employeeIdFilter } : {} }),
        api.get<{ data: Employee[] }>('/employees'),
      ]);
      setContracts(contractsRes.data.data);
      setEmployees(employeesRes.data.data);
    } catch (err) {
      const axiosErr = err as AxiosError<ApiErrorBody>;
      showToast({
        title: 'Failed to load contracts',
        description: getErrorMessage(axiosErr.response?.data?.error?.code, axiosErr.response?.data?.error?.message),
        variant: 'danger',
      });
    } finally {
      setIsLoading(false);
    }
  }, [employeeIdFilter, showToast]);

  useEffect(() => {
    if (canAccess) loadData();
  }, [canAccess, loadData]);

  const employeeNameById = useMemo(() => new Map(employees.map((e) => [e.id, e.fullName])), [employees]);

  const filtered = useMemo(() => {
    if (!search) return contracts;
    const needle = search.toLowerCase();
    return contracts.filter((c) =>
      `${c.contractNumber} ${employeeNameById.get(c.employeeId) ?? ''}`.toLowerCase().includes(needle)
    );
  }, [contracts, search, employeeNameById]);

  if (authLoading) return null;

  if (!canAccess) {
    return (
      <Container className="py-10">
        <EmptyState title="Not authorized" description="Contracts is only available to HR and payroll roles." />
      </Container>
    );
  }

  return (
    <Container className="flex flex-col gap-6 py-10">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--text-primary)]">Contracts</h1>
        <p className="text-xs text-[var(--text-tertiary)]">List view of employee contracts</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={() => router.push('/contracts/new')}>+ New</Button>

        <div className="flex min-w-[260px] flex-1 items-center gap-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] px-4 py-3">
          <SearchIcon />
          <input
            placeholder="Search contracts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-transparent text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-tertiary)]"
          />
        </div>
      </div>

      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : filtered.length === 0 ? (
        <EmptyState title="No contracts found" description="Create a contract to get started." />
      ) : (
        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell>Contract</TableHeaderCell>
              <TableHeaderCell>Employee</TableHeaderCell>
              <TableHeaderCell>Start</TableHeaderCell>
              <TableHeaderCell>End</TableHeaderCell>
              <TableHeaderCell>Wage / Month</TableHeaderCell>
              <TableHeaderCell>Status</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.map((c) => (
              <TableRow key={c.id} className="cursor-pointer" onClick={() => router.push(`/contracts/${c.id}`)}>
                <TableCell className="num font-medium">{c.contractNumber}</TableCell>
                <TableCell>{employeeNameById.get(c.employeeId) ?? '—'}</TableCell>
                <TableCell>{formatDate(c.startDate)}</TableCell>
                <TableCell>{formatDate(c.endDate)}</TableCell>
                <TableCell className="num">{formatWage(c.wagePerMonth)}</TableCell>
                <TableCell>
                  <Badge variant={c.status === 'running' ? 'success' : 'danger'} dot>
                    {c.status === 'running' ? 'Running' : 'Expired'}
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
