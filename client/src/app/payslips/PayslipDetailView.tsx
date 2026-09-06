'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AxiosError } from 'axios';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';
import { getErrorMessage } from '@/lib/errorMessages';
import { downloadFile } from '@/lib/downloadFile';
import { WARNING_TYPE_LABELS } from '@/lib/payslipWarnings';
import { Container } from '@/components/layout/Container';
import { Card, CardBody } from '@/components/ui/Card';
import { BackButton } from '@/components/ui/BackButton';
import { Badge, type BadgeVariant } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from '@/components/ui/Table';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';

type Role = 'employee' | 'hr_manager' | 'hr_payroll_user' | 'hr_payroll_manager' | 'admin';

const PAYSLIP_ROLES: Role[] = ['hr_payroll_user', 'hr_payroll_manager', 'admin'];
const STATUS_VARIANT: Record<string, BadgeVariant> = { draft: 'neutral', validated: 'info', paid: 'success' };
const CATEGORY_LABELS: Record<string, string> = {
  basic: 'Basic',
  allowance: 'Allowance',
  deduction: 'Deduction',
  gross: 'Gross',
  net: 'Net',
};

interface PayslipLine {
  id: string;
  name: string;
  code: string;
  category: string;
  amount: string;
}

interface Payslip {
  id: string;
  employee: { id: string; fullName: string } | null;
  payRun: { id: string; name: string; periodStart: string; periodEnd: string; salaryStructureId: string } | null;
  workedDays: string | null;
  basic: string | null;
  grossTotal: string | null;
  netTotal: string | null;
  warning: string | null;
  warningTypes: string[] | null;
  status: 'draft' | 'validated' | 'paid';
  lines: PayslipLine[];
}

interface SalaryStructure {
  id: string;
  name: string;
}

interface ApiErrorBody {
  error: { code: string; message: string };
}

function money(value: string | null): string {
  if (value === null) return '—';
  return `₹${Number(value).toLocaleString('en-IN')}`;
}

export function PayslipDetailView({ payslipId }: { payslipId: string }) {
  const { user, isLoading: authLoading } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();

  const [payslip, setPayslip] = useState<Payslip | null>(null);
  const [structures, setStructures] = useState<SalaryStructure[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [isActing, setIsActing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const canAccess = !!user && PAYSLIP_ROLES.includes(user.role);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [payslipRes, structuresRes] = await Promise.all([
        api.get<{ data: Payslip }>(`/payslips/${payslipId}`),
        api
          .get<{ data: SalaryStructure[] }>('/salary-structures', { params: { limit: 100 } })
          .catch(() => ({ data: { data: [] as SalaryStructure[] } })),
      ]);
      setPayslip(payslipRes.data.data);
      setStructures(structuresRes.data.data);
    } catch (err) {
      const axiosErr = err as AxiosError<ApiErrorBody>;
      if (axiosErr.response?.status === 404) {
        setNotFound(true);
      } else {
        showToast({
          title: 'Failed to load payslip',
          description: getErrorMessage(axiosErr.response?.data?.error?.code, axiosErr.response?.data?.error?.message),
          variant: 'danger',
        });
      }
    } finally {
      setIsLoading(false);
    }
  }, [payslipId, showToast]);

  useEffect(() => {
    if (canAccess) loadData();
  }, [canAccess, loadData]);

  const structureName = useMemo(
    () => structures.find((s) => s.id === payslip?.payRun?.salaryStructureId)?.name ?? '—',
    [structures, payslip]
  );

  async function handleMarkPaid() {
    setIsActing(true);
    try {
      await api.post(`/payslips/${payslipId}/mark-paid`);
      showToast({ title: 'Payslip marked paid', variant: 'success' });
      await loadData();
    } catch (err) {
      const axiosErr = err as AxiosError<ApiErrorBody>;
      showToast({
        title: 'Failed to mark paid',
        description: getErrorMessage(axiosErr.response?.data?.error?.code, axiosErr.response?.data?.error?.message),
        variant: 'danger',
      });
    } finally {
      setIsActing(false);
    }
  }

  async function handleDownload() {
    setIsDownloading(true);
    try {
      await downloadFile(`/payslips/${payslipId}/pdf`, `payslip-${payslip?.employee?.fullName?.replace(/\s+/g, '-') ?? payslipId}.pdf`);
    } catch (err) {
      const axiosErr = err as AxiosError<ApiErrorBody>;
      showToast({
        title: 'Failed to download PDF',
        description: getErrorMessage(axiosErr.response?.data?.error?.code, axiosErr.response?.data?.error?.message),
        variant: 'danger',
      });
    } finally {
      setIsDownloading(false);
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
        <EmptyState title="Not authorized" description="Payslips is only available to payroll roles." />
      </Container>
    );
  }

  if (notFound || !payslip) {
    return (
      <Container className="py-10">
        <EmptyState title="Payslip not found" description="It may have been removed." />
      </Container>
    );
  }

  return (
    <Container className="flex flex-col gap-6 py-10">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-2">
          <BackButton href="/payslips" label="Back to Payslips" />
          <h1 className="text-2xl font-semibold text-[var(--text-primary)]">Payslip / {payslip.employee?.fullName ?? '—'}</h1>
          <p className="text-xs text-[var(--text-tertiary)]">One employee's computed salary</p>
        </div>
        <Badge variant={STATUS_VARIANT[payslip.status]} dot>
          {payslip.status[0].toUpperCase() + payslip.status.slice(1)}
        </Badge>
      </div>

      <Card>
        <CardBody className="flex flex-col gap-6">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">Pay Run</span>
              <button
                type="button"
                onClick={() => payslip.payRun && router.push(`/pay-runs/${payslip.payRun.id}`)}
                className="w-fit text-sm font-medium text-[var(--text-link)] hover:underline"
              >
                {payslip.payRun?.name ?? '—'}
              </button>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">Period</span>
              <span className="text-sm text-[var(--text-primary)]">
                {payslip.payRun ? `${payslip.payRun.periodStart} → ${payslip.payRun.periodEnd}` : '—'}
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">Worked Days</span>
              <span className="num text-sm text-[var(--text-primary)]">{payslip.workedDays ?? '—'}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
                Salary Structure
              </span>
              <span className="text-sm text-[var(--text-primary)]">{structureName}</span>
            </div>
          </div>

          {payslip.warning && (
            <div className="flex flex-col gap-2 rounded-2xl bg-[var(--status-warning-bg)] px-4 py-3 text-sm text-[var(--status-warning-fg)]">
              {payslip.warningTypes && payslip.warningTypes.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {payslip.warningTypes.map((code) => (
                    <Badge key={code} variant="warning">
                      {WARNING_TYPE_LABELS[code] ?? code}
                    </Badge>
                  ))}
                </div>
              )}
              <p>{payslip.warning}</p>
            </div>
          )}

          <div className="grid grid-cols-3 gap-4">
            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">Basic</span>
              <span className="num text-lg font-semibold text-[var(--text-primary)]">{money(payslip.basic)}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">Gross</span>
              <span className="num text-lg font-semibold text-[var(--text-primary)]">{money(payslip.grossTotal)}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">Net</span>
              <span className="num text-lg font-semibold text-[var(--text-primary)]">{money(payslip.netTotal)}</span>
            </div>
          </div>

          {payslip.lines.length > 0 && (
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>Rule</TableHeaderCell>
                  <TableHeaderCell>Category</TableHeaderCell>
                  <TableHeaderCell>Code</TableHeaderCell>
                  <TableHeaderCell>Amount</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {payslip.lines.map((line) => (
                  <TableRow key={line.id}>
                    <TableCell className="font-medium">{line.name}</TableCell>
                    <TableCell>{CATEGORY_LABELS[line.category] ?? line.category}</TableCell>
                    <TableCell className="num">{line.code}</TableCell>
                    <TableCell className="num">{money(line.amount)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleDownload} isLoading={isDownloading}>
              Download Payslip (PDF)
            </Button>
            {payslip.status === 'validated' && (
              <Button onClick={handleMarkPaid} isLoading={isActing}>
                Mark Paid
              </Button>
            )}
          </div>
        </CardBody>
      </Card>
    </Container>
  );
}
