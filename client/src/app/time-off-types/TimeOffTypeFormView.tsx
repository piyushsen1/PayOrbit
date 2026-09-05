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
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';

type Role = 'employee' | 'hr_manager' | 'hr_payroll_user' | 'hr_payroll_manager' | 'admin';
type Status = 'active' | 'inactive';

const TIME_OFF_TYPE_MODULE_ROLES: Role[] = ['hr_manager', 'hr_payroll_user', 'hr_payroll_manager', 'admin'];

const UNIT_OPTIONS = [
  { value: 'days', label: 'Days' },
  { value: 'hours', label: 'Hours' },
];

const APPROVAL_ROLE_OPTIONS = [
  { value: 'hr_manager', label: 'HR Manager' },
  { value: 'hr_payroll_user', label: 'HR Payroll User' },
  { value: 'hr_payroll_manager', label: 'HR Payroll Manager' },
  { value: 'admin', label: 'Admin' },
];

interface TimeOffType {
  id: string;
  name: string;
  unit: 'days' | 'hours';
  allocationRequired: boolean;
  approvalRole: string;
  affectsPayroll: boolean;
  color: string | null;
  status: Status;
  notes: string | null;
}

interface ApiErrorBody {
  error: { code: string; message: string };
}

export interface TimeOffTypeFormViewProps {
  mode: 'create' | 'edit';
  typeId?: string;
}

export function TimeOffTypeFormView({ mode, typeId }: TimeOffTypeFormViewProps) {
  const { user, isLoading: authLoading } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();

  const [name, setName] = useState('');
  const [unit, setUnit] = useState<'days' | 'hours'>('days');
  const [allocationRequired, setAllocationRequired] = useState(true);
  const [approvalRole, setApprovalRole] = useState('hr_manager');
  const [affectsPayroll, setAffectsPayroll] = useState(true);
  const [color, setColor] = useState('#2c5ead');
  const [status, setStatus] = useState<Status>('active');
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(mode === 'edit');
  const [notFound, setNotFound] = useState(false);
  const [formError, setFormError] = useState<string | undefined>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const canAccess = !!user && TIME_OFF_TYPE_MODULE_ROLES.includes(user.role);

  const loadData = useCallback(async () => {
    if (mode !== 'edit' || !typeId) return;
    setIsLoading(true);
    try {
      const { data } = await api.get<{ data: TimeOffType }>(`/time-off-types/${typeId}`);
      const t = data.data;
      setName(t.name);
      setUnit(t.unit);
      setAllocationRequired(t.allocationRequired);
      setApprovalRole(t.approvalRole);
      setAffectsPayroll(t.affectsPayroll);
      setColor(t.color ?? '#2c5ead');
      setStatus(t.status);
      setNotes(t.notes ?? '');
    } catch (err) {
      const axiosErr = err as AxiosError<ApiErrorBody>;
      if (axiosErr.response?.status === 404) {
        setNotFound(true);
      } else {
        showToast({
          title: 'Failed to load time off type',
          description: getErrorMessage(axiosErr.response?.data?.error?.code, axiosErr.response?.data?.error?.message),
          variant: 'danger',
        });
      }
    } finally {
      setIsLoading(false);
    }
  }, [mode, typeId, showToast]);

  useEffect(() => {
    if (canAccess) loadData();
  }, [canAccess, loadData]);

  async function handleSave() {
    setFormError(undefined);
    if (!name.trim()) {
      setFormError('Type name is required.');
      return;
    }

    const payload = {
      name,
      unit,
      allocationRequired,
      approvalRole,
      affectsPayroll,
      color,
      status,
      notes,
    };

    setIsSubmitting(true);
    try {
      if (mode === 'create') {
        const { data } = await api.post<{ data: TimeOffType }>('/time-off-types', payload);
        showToast({ title: 'Time off type created', variant: 'success' });
        router.push(`/time-off-types/${data.data.id}`);
      } else if (typeId) {
        await api.patch(`/time-off-types/${typeId}`, payload);
        showToast({ title: 'Time off type saved', variant: 'success' });
        router.push('/time-off-types');
      }
    } catch (err) {
      const axiosErr = err as AxiosError<ApiErrorBody>;
      setFormError(getErrorMessage(axiosErr.response?.data?.error?.code, axiosErr.response?.data?.error?.message));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!typeId) return;
    if (!window.confirm('Delete this time off type? This cannot be undone.')) return;
    setIsDeleting(true);
    try {
      await api.delete(`/time-off-types/${typeId}`);
      showToast({ title: 'Time off type deleted', variant: 'success' });
      router.push('/time-off-types');
    } catch (err) {
      const axiosErr = err as AxiosError<ApiErrorBody>;
      showToast({
        title: 'Failed to delete time off type',
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

  if (!canAccess) {
    return (
      <Container className="py-10">
        <EmptyState title="Not authorized" description="Time Off Types is only available to HR and payroll roles." />
      </Container>
    );
  }

  if (mode === 'edit' && notFound) {
    return (
      <Container className="py-10">
        <EmptyState title="Time off type not found" description="It may have been removed." />
      </Container>
    );
  }

  return (
    <Container className="flex flex-col gap-6 py-10">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--text-primary)]">
          {mode === 'create' ? 'New Time Off Type' : `Time Off Type / ${name}`}
        </h1>
        <p className="text-xs text-[var(--text-tertiary)]">Defines one leave policy</p>
      </div>

      <Card>
        <CardBody className="flex flex-col gap-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Input label="Type Name *" value={name} onChange={(e) => setName(e.target.value)} />
            <Select
              label="Unit"
              options={UNIT_OPTIONS}
              value={unit}
              onChange={(e) => setUnit(e.target.value as 'days' | 'hours')}
            />

            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
                Allocation Required
              </span>
              <button type="button" onClick={() => setAllocationRequired((prev) => !prev)} className="w-fit">
                <Badge variant={allocationRequired ? 'info' : 'neutral'} dot>
                  {allocationRequired ? 'Required' : 'Not required'}
                </Badge>
              </button>
            </div>

            <Select
              label="Approval Role"
              options={APPROVAL_ROLE_OPTIONS}
              value={approvalRole}
              onChange={(e) => setApprovalRole(e.target.value)}
            />

            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
                Payroll / Work Entry Mapping
              </span>
              <button type="button" onClick={() => setAffectsPayroll((prev) => !prev)} className="w-fit">
                <Badge variant={affectsPayroll ? 'info' : 'neutral'} dot>
                  {affectsPayroll ? 'Affects payroll' : 'No payroll impact'}
                </Badge>
              </button>
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
                Display Color
              </span>
              <div className="flex items-center gap-2">
                <span
                  className="h-9 w-9 shrink-0 rounded-lg border border-[var(--border-default)]"
                  style={{ backgroundColor: color }}
                  aria-hidden="true"
                />
                <Input value={color} onChange={(e) => setColor(e.target.value)} placeholder="#2c5ead" />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">Active</span>
              <button type="button" onClick={() => setStatus((prev) => (prev === 'active' ? 'inactive' : 'active'))} className="w-fit">
                <Badge variant={status === 'active' ? 'success' : 'neutral'} dot>
                  {status === 'active' ? 'Active' : 'Inactive'}
                </Badge>
              </button>
            </div>
          </div>

          <Textarea label="Configuration Notes" value={notes} onChange={(e) => setNotes(e.target.value)} />

          {formError && (
            <p className="rounded-2xl bg-[var(--status-danger-bg)] px-4 py-3 text-sm text-[var(--status-danger-fg)]">
              {formError}
            </p>
          )}

          <div className="flex justify-between gap-2">
            {mode === 'edit' ? (
              <Button variant="danger" onClick={handleDelete} isLoading={isDeleting}>
                Delete
              </Button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => router.push('/time-off-types')}>
                Cancel
              </Button>
              <Button onClick={handleSave} isLoading={isSubmitting}>
                {mode === 'create' ? 'Create Type' : 'Save'}
              </Button>
            </div>
          </div>
        </CardBody>
      </Card>
    </Container>
  );
}
