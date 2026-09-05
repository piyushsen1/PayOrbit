'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AxiosError } from 'axios';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';
import { getErrorMessage } from '@/lib/errorMessages';
import { Container } from '@/components/layout/Container';
import { Card, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from '@/components/ui/Table';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';

type Role = 'employee' | 'hr_manager' | 'hr_payroll_user' | 'hr_payroll_manager' | 'admin';

const READ_ROLES: Role[] = ['hr_payroll_user', 'hr_payroll_manager', 'admin'];
const MANAGE_ROLES: Role[] = ['hr_payroll_manager', 'admin'];

interface SalaryRule {
  id: string;
  name: string;
  code: string;
  category: string;
  sequence: number;
}

interface SalaryStructure {
  id: string;
  name: string;
  active: boolean;
  rules: SalaryRule[];
}

interface ApiErrorBody {
  error: { code: string; message: string };
}

const CATEGORY_LABELS: Record<string, string> = {
  basic: 'Basic',
  allowance: 'Allowance',
  deduction: 'Deduction',
  gross: 'Gross',
  net: 'Net',
};

export interface SalaryStructureFormViewProps {
  mode: 'create' | 'edit';
  structureId?: string;
}

export function SalaryStructureFormView({ mode, structureId }: SalaryStructureFormViewProps) {
  const { user, isLoading: authLoading } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();

  const [name, setName] = useState('');
  const [active, setActive] = useState(true);
  const [rules, setRules] = useState<SalaryRule[]>([]);
  const [isLoading, setIsLoading] = useState(mode === 'edit');
  const [notFound, setNotFound] = useState(false);
  const [formError, setFormError] = useState<string | undefined>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const canView = !!user && READ_ROLES.includes(user.role);
  const canManage = !!user && MANAGE_ROLES.includes(user.role);

  const loadData = useCallback(async () => {
    if (mode !== 'edit' || !structureId) return;
    setIsLoading(true);
    try {
      const { data } = await api.get<{ data: SalaryStructure }>(`/salary-structures/${structureId}`);
      setName(data.data.name);
      setActive(data.data.active);
      setRules(data.data.rules);
    } catch (err) {
      const axiosErr = err as AxiosError<ApiErrorBody>;
      if (axiosErr.response?.status === 404) {
        setNotFound(true);
      } else {
        showToast({
          title: 'Failed to load salary structure',
          description: getErrorMessage(axiosErr.response?.data?.error?.code, axiosErr.response?.data?.error?.message),
          variant: 'danger',
        });
      }
    } finally {
      setIsLoading(false);
    }
  }, [mode, structureId, showToast]);

  useEffect(() => {
    if (canView) loadData();
  }, [canView, loadData]);

  async function handleSave() {
    setFormError(undefined);
    if (!name.trim()) {
      setFormError('Structure name is required.');
      return;
    }
    setIsSubmitting(true);
    try {
      if (mode === 'create') {
        const { data } = await api.post<{ data: SalaryStructure }>('/salary-structures', { name, active });
        showToast({ title: 'Salary structure created', variant: 'success' });
        router.push(`/salary-structures/${data.data.id}`);
      } else if (structureId) {
        await api.patch(`/salary-structures/${structureId}`, { name, active });
        showToast({ title: 'Salary structure saved', variant: 'success' });
        router.push('/salary-structures');
      }
    } catch (err) {
      const axiosErr = err as AxiosError<ApiErrorBody>;
      setFormError(getErrorMessage(axiosErr.response?.data?.error?.code, axiosErr.response?.data?.error?.message));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!structureId) return;
    if (!window.confirm('Delete this salary structure? Its rules will be deleted too. This cannot be undone.')) return;
    setIsDeleting(true);
    try {
      await api.delete(`/salary-structures/${structureId}`);
      showToast({ title: 'Salary structure deleted', variant: 'success' });
      router.push('/salary-structures');
    } catch (err) {
      const axiosErr = err as AxiosError<ApiErrorBody>;
      showToast({
        title: 'Failed to delete salary structure',
        description: getErrorMessage(axiosErr.response?.data?.error?.code, axiosErr.response?.data?.error?.message),
        variant: 'danger',
      });
    } finally {
      setIsDeleting(false);
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

  if (!canView) {
    return (
      <Container className="py-10">
        <EmptyState title="Not authorized" description="Salary Structures is only available to payroll roles." />
      </Container>
    );
  }

  if (mode === 'edit' && notFound) {
    return (
      <Container className="py-10">
        <EmptyState title="Salary structure not found" description="It may have been removed." />
      </Container>
    );
  }

  const readOnly = !canManage;

  return (
    <Container className="flex flex-col gap-6 py-10">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--text-primary)]">
          {mode === 'create' ? 'New Salary Structure' : `Salary Structure / ${name}`}
        </h1>
        <p className="text-xs text-[var(--text-tertiary)]">Ordered rule set</p>
      </div>

      <Card>
        <CardBody className="flex flex-col gap-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Input label="Structure Name *" value={name} disabled={readOnly} onChange={(e) => setName(e.target.value)} />
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">Active</span>
              <button
                type="button"
                disabled={readOnly}
                onClick={() => setActive((prev) => !prev)}
                className="w-fit disabled:cursor-not-allowed"
              >
                <Badge variant={active ? 'success' : 'neutral'} dot>
                  {active ? 'Active' : 'Inactive'}
                </Badge>
              </button>
            </div>
          </div>

          {mode === 'edit' && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-[var(--text-primary)]">Salary Rules</h2>
                {canManage && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push(`/salary-rules/new?salaryStructureId=${structureId}`)}
                  >
                    + New Rule
                  </Button>
                )}
              </div>
              {rules.length === 0 ? (
                <EmptyState title="No rules yet" description="Add rules to define this structure's computation." />
              ) : (
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableHeaderCell>Name</TableHeaderCell>
                      <TableHeaderCell>Code</TableHeaderCell>
                      <TableHeaderCell>Category</TableHeaderCell>
                      <TableHeaderCell>Sequence</TableHeaderCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {rules.map((r) => (
                      <TableRow key={r.id} className="cursor-pointer" onClick={() => router.push(`/salary-rules/${r.id}`)}>
                        <TableCell className="font-medium">{r.name}</TableCell>
                        <TableCell className="num">{r.code}</TableCell>
                        <TableCell>{CATEGORY_LABELS[r.category] ?? r.category}</TableCell>
                        <TableCell className="num">{r.sequence}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          )}

          {formError && (
            <p className="rounded-2xl bg-[var(--status-danger-bg)] px-4 py-3 text-sm text-[var(--status-danger-fg)]">
              {formError}
            </p>
          )}

          <div className="flex justify-between gap-2">
            {mode === 'edit' && canManage ? (
              <Button variant="danger" onClick={handleDelete} isLoading={isDeleting}>
                Delete
              </Button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => router.push('/salary-structures')}>
                {readOnly ? 'Back' : 'Cancel'}
              </Button>
              {canManage && (
                <Button onClick={handleSave} isLoading={isSubmitting}>
                  {mode === 'create' ? 'Create Structure' : 'Save'}
                </Button>
              )}
            </div>
          </div>
        </CardBody>
      </Card>
    </Container>
  );
}
