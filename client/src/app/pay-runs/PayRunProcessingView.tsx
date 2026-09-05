'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AxiosError } from 'axios';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';
import { getErrorMessage } from '@/lib/errorMessages';
import { downloadFile } from '@/lib/downloadFile';
import { WARNING_TYPE_LABELS } from '@/lib/payslipWarnings';
import { Container } from '@/components/layout/Container';
import { Card, CardBody } from '@/components/ui/Card';
import { Badge, type BadgeVariant } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from '@/components/ui/Table';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';

type Role = 'employee' | 'hr_manager' | 'hr_payroll_user' | 'hr_payroll_manager' | 'admin';

const PAY_RUN_ROLES: Role[] = ['hr_payroll_user', 'hr_payroll_manager', 'admin'];
const DELETE_ROLES: Role[] = ['hr_payroll_manager', 'admin'];
const STATUS_VARIANT: Record<string, BadgeVariant> = { draft: 'neutral', validated: 'info', paid: 'success' };

interface Payslip {
  id: string;
  employee: { id: string; fullName: string } | null;
  workedDays: string | null;
  basic: string | null;
  grossTotal: string | null;
  netTotal: string | null;
  warning: string | null;
  warningTypes: string[] | null;
  status: 'draft' | 'validated' | 'paid';
}

interface PayRunDetail {
  id: string;
  name: string;
  salaryStructure: { id: string; name: string } | null;
  periodStart: string;
  periodEnd: string;
  status: 'draft' | 'validated' | 'paid';
  payslips: Payslip[];
}

interface ApiErrorBody {
  error: { code: string; message: string };
}

function money(value: string | null): string {
  if (value === null) return '—';
  return `₹${Number(value).toLocaleString('en-IN')}`;
}

export function PayRunProcessingView({ payRunId }: { payRunId: string }) {
  const { user, isLoading: authLoading } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();

  const [payRun, setPayRun] = useState<PayRunDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [isActing, setIsActing] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const canAccess = !!user && PAY_RUN_ROLES.includes(user.role);
  const canDelete = !!user && DELETE_ROLES.includes(user.role);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data } = await api.get<{ data: PayRunDetail }>(`/pay-runs/${payRunId}`);
      setPayRun(data.data);
    } catch (err) {
      const axiosErr = err as AxiosError<ApiErrorBody>;
      if (axiosErr.response?.status === 404) {
        setNotFound(true);
      } else {
        showToast({
          title: 'Failed to load pay run',
          description: getErrorMessage(axiosErr.response?.data?.error?.code, axiosErr.response?.data?.error?.message),
          variant: 'danger',
        });
      }
    } finally {
      setIsLoading(false);
    }
  }, [payRunId, showToast]);

  useEffect(() => {
    if (canAccess) loadData();
  }, [canAccess, loadData]);

  async function runAction(action: 'compute' | 'validate' | 'mark-paid' | 'send-payslips') {
    setIsActing(true);
    try {
      if (action === 'send-payslips') {
        const { data } = await api.post<{ data: { sent: number; failed: number } }>(`/pay-runs/${payRunId}/send-payslips`);
        showToast({
          title: 'Payslips sent',
          description: `${data.data.sent} sent${data.data.failed ? `, ${data.data.failed} failed` : ''}.`,
          variant: data.data.failed ? 'warning' : 'success',
        });
      } else {
        await api.post(`/pay-runs/${payRunId}/${action}`);
        showToast({ title: `Pay run ${action === 'mark-paid' ? 'marked paid' : action + 'd'}`, variant: 'success' });
      }
      await loadData();
    } catch (err) {
      const axiosErr = err as AxiosError<ApiErrorBody>;
      showToast({
        title: 'Action failed',
        description: getErrorMessage(axiosErr.response?.data?.error?.code, axiosErr.response?.data?.error?.message),
        variant: 'danger',
      });
    } finally {
      setIsActing(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm('Delete this pay run and all its payslips? This cannot be undone.')) return;
    setIsActing(true);
    try {
      await api.delete(`/pay-runs/${payRunId}`);
      showToast({ title: 'Pay run deleted', variant: 'success' });
      router.push('/pay-runs');
    } catch (err) {
      const axiosErr = err as AxiosError<ApiErrorBody>;
      showToast({
        title: 'Failed to delete pay run',
        description: getErrorMessage(axiosErr.response?.data?.error?.code, axiosErr.response?.data?.error?.message),
        variant: 'danger',
      });
    } finally {
      setIsActing(false);
    }
  }

  async function handleDownloadPdf(e: React.MouseEvent, payslipId: string, employeeName: string) {
    e.stopPropagation();
    setDownloadingId(payslipId);
    try {
      await downloadFile(`/payslips/${payslipId}/pdf`, `payslip-${employeeName.replace(/\s+/g, '-')}.pdf`);
    } catch (err) {
      const axiosErr = err as AxiosError<ApiErrorBody>;
      showToast({
        title: 'Failed to download PDF',
        description: getErrorMessage(axiosErr.response?.data?.error?.code, axiosErr.response?.data?.error?.message),
        variant: 'danger',
      });
    } finally {
      setDownloadingId(null);
    }
  }

  if (authLoading || isLoading) {
    return (
      <Container className="flex flex-col gap-3 py-10">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </Container>
    );
  }

  if (!canAccess) {
    return (
      <Container className="py-10">
        <EmptyState title="Not authorized" description="Pay Runs is only available to payroll roles." />
      </Container>
    );
  }

  if (notFound || !payRun) {
    return (
      <Container className="py-10">
        <EmptyState title="Pay run not found" description="It may have been removed." />
      </Container>
    );
  }

  const allComputed = payRun.payslips.every((p) => p.basic !== null);

  return (
    <Container className="flex flex-col gap-6 py-10">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--text-primary)]">{payRun.name}</h1>
          <p className="text-xs text-[var(--text-tertiary)]">
            {payRun.salaryStructure?.name ?? '—'} • {payRun.periodStart} → {payRun.periodEnd}
          </p>
        </div>
        <Badge variant={STATUS_VARIANT[payRun.status]} dot>
          {payRun.status[0].toUpperCase() + payRun.status.slice(1)}
        </Badge>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {payRun.status === 'draft' && (
          <>
            <Button variant="outline" onClick={() => runAction('compute')} isLoading={isActing}>
              Compute
            </Button>
            <Button onClick={() => runAction('validate')} isLoading={isActing} disabled={!allComputed}>
              Validate
            </Button>
          </>
        )}
        {payRun.status === 'validated' && (
          <>
            <Button onClick={() => runAction('mark-paid')} isLoading={isActing}>
              Mark Paid
            </Button>
            <Button variant="outline" onClick={() => runAction('send-payslips')} isLoading={isActing}>
              Send Payslips
            </Button>
          </>
        )}
        {payRun.status === 'paid' && (
          <Button variant="outline" onClick={() => runAction('send-payslips')} isLoading={isActing}>
            Send Payslips
          </Button>
        )}
        {canDelete && (
          <Button variant="danger" onClick={handleDelete} isLoading={isActing} className="ml-auto">
            Delete Pay Run
          </Button>
        )}
      </div>

      <Table>
        <TableHead>
          <TableRow>
            <TableHeaderCell>Employee</TableHeaderCell>
            <TableHeaderCell>Warning</TableHeaderCell>
            <TableHeaderCell>Worked</TableHeaderCell>
            <TableHeaderCell>Basic</TableHeaderCell>
            <TableHeaderCell>Gross</TableHeaderCell>
            <TableHeaderCell>Net</TableHeaderCell>
            <TableHeaderCell>Status</TableHeaderCell>
            <TableHeaderCell>PDF</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {payRun.payslips.map((p) => (
            <TableRow key={p.id} className="cursor-pointer" onClick={() => router.push(`/payslips/${p.id}`)}>
              <TableCell className="font-medium">{p.employee?.fullName ?? '—'}</TableCell>
              <TableCell>
                {p.warningTypes && p.warningTypes.length > 0 ? (
                  <div className="flex flex-wrap gap-1" title={p.warning ?? undefined}>
                    {p.warningTypes.map((code) => (
                      <Badge key={code} variant="warning">
                        {WARNING_TYPE_LABELS[code] ?? code}
                      </Badge>
                    ))}
                  </div>
                ) : p.warning ? (
                  <Badge variant="warning" title={p.warning}>
                    Warning
                  </Badge>
                ) : (
                  '—'
                )}
              </TableCell>
              <TableCell className="num">{p.workedDays ?? '—'}</TableCell>
              <TableCell className="num">{money(p.basic)}</TableCell>
              <TableCell className="num">{money(p.grossTotal)}</TableCell>
              <TableCell className="num">{money(p.netTotal)}</TableCell>
              <TableCell>
                <Badge variant={STATUS_VARIANT[p.status]} dot>
                  {p.status[0].toUpperCase() + p.status.slice(1)}
                </Badge>
              </TableCell>
              <TableCell>
                {p.basic !== null && (
                  <Button
                    variant="outline"
                    size="sm"
                    isLoading={downloadingId === p.id}
                    onClick={(e) => handleDownloadPdf(e, p.id, p.employee?.fullName ?? 'employee')}
                  >
                    Download
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Container>
  );
}
