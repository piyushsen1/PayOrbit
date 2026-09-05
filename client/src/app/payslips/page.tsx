'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AxiosError } from 'axios';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';
import { getErrorMessage } from '@/lib/errorMessages';
import { Container } from '@/components/layout/Container';
import { Badge, type BadgeVariant } from '@/components/ui/Badge';
import { Select } from '@/components/ui/Select';
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from '@/components/ui/Table';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { Pagination, type PaginationMeta } from '@/components/ui/Pagination';

type Role = 'employee' | 'hr_manager' | 'hr_payroll_user' | 'hr_payroll_manager' | 'admin';

const PAYSLIP_ROLES: Role[] = ['hr_payroll_user', 'hr_payroll_manager', 'admin'];
const STATUS_VARIANT: Record<string, BadgeVariant> = { draft: 'neutral', validated: 'info', paid: 'success' };

interface PayRun {
  id: string;
  name: string;
  periodStart: string;
  periodEnd: string;
}

interface Payslip {
  id: string;
  employee: { id: string; fullName: string } | null;
  payRun: { id: string; name: string; periodStart: string; periodEnd: string; salaryStructure?: { name: string } | null } | null;
  basic: string | null;
  grossTotal: string | null;
  netTotal: string | null;
  status: 'draft' | 'validated' | 'paid';
}

interface ApiErrorBody {
  error: { code: string; message: string };
}

function money(value: string | null): string {
  if (value === null) return '—';
  return `₹${Number(value).toLocaleString('en-IN')}`;
}

export default function PayslipsPage() {
  return (
    <Suspense
      fallback={
        <Container className="flex flex-col gap-3 py-10">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-64 w-full" />
        </Container>
      }
    >
      <PayslipsPageContent />
    </Suspense>
  );
}

function PayslipsPageContent() {
  const { user, isLoading: authLoading } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const payRunIdFilter = searchParams.get('payRunId') ?? '';

  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [payRuns, setPayRuns] = useState<PayRun[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  const canAccess = !!user && PAYSLIP_ROLES.includes(user.role);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [payslipsRes, payRunsRes] = await Promise.all([
        api.get<{ data: Payslip[]; meta: PaginationMeta }>('/payslips', {
          params: { ...(payRunIdFilter ? { payRunId: payRunIdFilter } : {}), page },
        }),
        api.get<{ data: PayRun[] }>('/pay-runs', { params: { limit: 100 } }),
      ]);
      setPayslips(payslipsRes.data.data);
      setMeta(payslipsRes.data.meta);
      setPayRuns(payRunsRes.data.data);
    } catch (err) {
      const axiosErr = err as AxiosError<ApiErrorBody>;
      showToast({
        title: 'Failed to load payslips',
        description: getErrorMessage(axiosErr.response?.data?.error?.code, axiosErr.response?.data?.error?.message),
        variant: 'danger',
      });
    } finally {
      setIsLoading(false);
    }
  }, [payRunIdFilter, showToast, page]);

  useEffect(() => {
    if (canAccess) loadData();
  }, [canAccess, loadData]);

  if (authLoading) return null;

  if (!canAccess) {
    return (
      <Container className="py-10">
        <EmptyState title="Not authorized" description="Payslips is only available to payroll roles." />
      </Container>
    );
  }

  return (
    <Container className="flex flex-col gap-6 py-10">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--text-primary)]">Payslips</h1>
        <p className="text-xs text-[var(--text-tertiary)]">All payslips across pay runs</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Select
          placeholder="All periods"
          options={payRuns.map((p) => ({ value: p.id, label: `${p.name} (${p.periodStart} → ${p.periodEnd})` }))}
          value={payRunIdFilter}
          onChange={(e) => router.push(e.target.value ? `/payslips?payRunId=${e.target.value}` : '/payslips')}
          className="w-72"
        />
      </div>

      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : payslips.length === 0 ? (
        <EmptyState title="No payslips found" description="Payslips are created from a Pay Run." />
      ) : (
        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell>Employee</TableHeaderCell>
              <TableHeaderCell>Period</TableHeaderCell>
              <TableHeaderCell>Basic</TableHeaderCell>
              <TableHeaderCell>Gross</TableHeaderCell>
              <TableHeaderCell>Net</TableHeaderCell>
              <TableHeaderCell>Structure</TableHeaderCell>
              <TableHeaderCell>Status</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {payslips.map((p) => (
              <TableRow key={p.id} className="cursor-pointer" onClick={() => router.push(`/payslips/${p.id}`)}>
                <TableCell className="font-medium">{p.employee?.fullName ?? '—'}</TableCell>
                <TableCell>{p.payRun ? `${p.payRun.periodStart} → ${p.payRun.periodEnd}` : '—'}</TableCell>
                <TableCell className="num">{money(p.basic)}</TableCell>
                <TableCell className="num">{money(p.grossTotal)}</TableCell>
                <TableCell className="num">{money(p.netTotal)}</TableCell>
                <TableCell>{p.payRun?.salaryStructure?.name ?? '—'}</TableCell>
                <TableCell>
                  <Badge variant={STATUS_VARIANT[p.status]} dot>
                    {p.status[0].toUpperCase() + p.status.slice(1)}
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
