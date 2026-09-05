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
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from '@/components/ui/Table';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';

type Role = 'employee' | 'hr_manager' | 'hr_payroll_user' | 'hr_payroll_manager' | 'admin';

const PAY_RUN_ROLES: Role[] = ['hr_payroll_user', 'hr_payroll_manager', 'admin'];
const STATUS_VARIANT: Record<string, BadgeVariant> = { draft: 'neutral', validated: 'info', paid: 'success' };

interface PayRun {
  id: string;
  name: string;
  periodStart: string;
  periodEnd: string;
  status: 'draft' | 'validated' | 'paid';
  employeeCount: number;
  warningCount: number;
}

interface ApiErrorBody {
  error: { code: string; message: string };
}

export default function PayRunsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();

  const [payRuns, setPayRuns] = useState<PayRun[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const canAccess = !!user && PAY_RUN_ROLES.includes(user.role);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data } = await api.get<{ data: PayRun[] }>('/pay-runs');
      setPayRuns(data.data);
    } catch (err) {
      const axiosErr = err as AxiosError<ApiErrorBody>;
      showToast({
        title: 'Failed to load pay runs',
        description: getErrorMessage(axiosErr.response?.data?.error?.code, axiosErr.response?.data?.error?.message),
        variant: 'danger',
      });
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    if (canAccess) loadData();
  }, [canAccess, loadData]);

  if (authLoading) return null;

  if (!canAccess) {
    return (
      <Container className="py-10">
        <EmptyState title="Not authorized" description="Pay Runs is only available to payroll roles." />
      </Container>
    );
  }

  return (
    <Container className="flex flex-col gap-6 py-10">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--text-primary)]">Pay Runs</h1>
        <p className="text-xs text-[var(--text-tertiary)]">All payroll periods</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={() => router.push('/pay-runs/new')}>+ New Pay Run</Button>
      </div>

      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : payRuns.length === 0 ? (
        <EmptyState title="No pay runs yet" description="Create the first pay run to get started." />
      ) : (
        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell>Period</TableHeaderCell>
              <TableHeaderCell>Employees</TableHeaderCell>
              <TableHeaderCell>Status</TableHeaderCell>
              <TableHeaderCell>Warnings</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {payRuns.map((p) => (
              <TableRow key={p.id} className="cursor-pointer" onClick={() => router.push(`/pay-runs/${p.id}`)}>
                <TableCell className="font-medium">
                  {p.name}
                  <span className="ml-2 text-xs text-[var(--text-tertiary)]">
                    ({p.periodStart} → {p.periodEnd})
                  </span>
                </TableCell>
                <TableCell className="num">{p.employeeCount}</TableCell>
                <TableCell>
                  <Badge variant={STATUS_VARIANT[p.status]} dot>
                    {p.status[0].toUpperCase() + p.status.slice(1)}
                  </Badge>
                </TableCell>
                <TableCell className="num">
                  {p.warningCount > 0 ? <Badge variant="warning">{p.warningCount}</Badge> : '—'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Container>
  );
}
