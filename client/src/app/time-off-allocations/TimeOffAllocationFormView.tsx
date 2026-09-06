'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AxiosError } from 'axios';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';
import { getErrorMessage } from '@/lib/errorMessages';
import { Container } from '@/components/layout/Container';
import { Card, CardBody } from '@/components/ui/Card';
import { BackButton } from '@/components/ui/BackButton';
import { Badge, type BadgeVariant } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';

type Role = 'employee' | 'hr_manager' | 'hr_payroll_user' | 'hr_payroll_manager' | 'admin';

const HR_ROLES: Role[] = ['hr_manager', 'hr_payroll_user', 'hr_payroll_manager', 'admin'];
const STATUS_VARIANT: Record<string, BadgeVariant> = { pending: 'warning', approved: 'success', refused: 'danger' };

interface Employee {
  id: string;
  fullName: string;
}

interface TimeOffType {
  id: string;
  name: string;
}

interface Allocation {
  id: string;
  employee: { id: string; fullName: string } | null;
  timeOffType: { id: string; name: string } | null;
  allocated: string;
  status: 'pending' | 'approved' | 'refused';
  validFrom: string | null;
  validTo: string | null;
  description: string | null;
  taken: number;
  remaining: number;
}

interface ApiErrorBody {
  error: { code: string; message: string };
}

export interface TimeOffAllocationFormViewProps {
  mode: 'create' | 'edit';
  allocationId?: string;
}

export function TimeOffAllocationFormView({ mode, allocationId }: TimeOffAllocationFormViewProps) {
  const { user, isLoading: authLoading } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [types, setTypes] = useState<TimeOffType[]>([]);
  const [employeeId, setEmployeeId] = useState('');
  const [timeOffTypeId, setTimeOffTypeId] = useState('');
  const [employeeName, setEmployeeName] = useState('');
  const [typeName, setTypeName] = useState('');
  const [allocated, setAllocated] = useState('');
  const [validFrom, setValidFrom] = useState('');
  const [validTo, setValidTo] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<'pending' | 'approved' | 'refused'>('pending');
  const [taken, setTaken] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [notAuthorized, setNotAuthorized] = useState(false);
  const [formError, setFormError] = useState<string | undefined>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeciding, setIsDeciding] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const isHr = !!user && HR_ROLES.includes(user.role);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      if (mode === 'create') {
        if (!isHr) {
          setNotAuthorized(true);
          return;
        }
        const [employeesRes, typesRes] = await Promise.all([
          api.get<{ data: Employee[] }>('/employees', { params: { limit: 100, status: 'active' } }),
          api.get<{ data: TimeOffType[] }>('/time-off-types', { params: { limit: 100 } }),
        ]);
        setEmployees(employeesRes.data.data);
        setTypes(typesRes.data.data);
        return;
      }

      if (allocationId) {
        try {
          const { data } = await api.get<{ data: Allocation }>(`/time-off-allocations/${allocationId}`);
          const a = data.data;
          setEmployeeName(a.employee?.fullName ?? '—');
          setTypeName(a.timeOffType?.name ?? '—');
          setAllocated(a.allocated);
          setValidFrom(a.validFrom ?? '');
          setValidTo(a.validTo ?? '');
          setDescription(a.description ?? '');
          setStatus(a.status);
          setTaken(a.taken);
          setRemaining(a.remaining);
        } catch (err) {
          const axiosErr = err as AxiosError<ApiErrorBody>;
          if (axiosErr.response?.status === 404) {
            setNotFound(true);
          } else if (axiosErr.response?.status === 403) {
            setNotAuthorized(true);
          } else {
            throw err;
          }
        }
      }
    } catch (err) {
      const axiosErr = err as AxiosError<ApiErrorBody>;
      showToast({
        title: 'Failed to load allocation data',
        description: getErrorMessage(axiosErr.response?.data?.error?.code, axiosErr.response?.data?.error?.message),
        variant: 'danger',
      });
    } finally {
      setIsLoading(false);
    }
  }, [mode, allocationId, isHr, showToast]);

  useEffect(() => {
    if (user) loadData();
  }, [user, loadData]);

  async function handleSave() {
    setFormError(undefined);
    if (mode === 'create' && (!employeeId || !timeOffTypeId)) {
      setFormError('Select an employee and a time off type.');
      return;
    }
    const amount = Number(allocated);
    if (!amount || amount <= 0) {
      setFormError('Enter a valid allocated amount.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (mode === 'create') {
        const { data } = await api.post<{ data: Allocation }>('/time-off-allocations', {
          employeeId,
          timeOffTypeId,
          allocated: amount,
          validFrom: validFrom || null,
          validTo: validTo || null,
          description: description || null,
        });
        showToast({ title: 'Allocation created', variant: 'success' });
        router.push(`/time-off-allocations/${data.data.id}`);
      } else if (allocationId) {
        await api.patch(`/time-off-allocations/${allocationId}`, {
          allocated: amount,
          validFrom: validFrom || null,
          validTo: validTo || null,
          description: description || null,
        });
        showToast({ title: 'Allocation saved', variant: 'success' });
        router.push('/time-off-allocations');
      }
    } catch (err) {
      const axiosErr = err as AxiosError<ApiErrorBody>;
      setFormError(getErrorMessage(axiosErr.response?.data?.error?.code, axiosErr.response?.data?.error?.message));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDecision(decision: 'approve' | 'refuse') {
    if (!allocationId) return;
    setIsDeciding(true);
    try {
      const { data } = await api.post<{ data: Allocation }>(`/time-off-allocations/${allocationId}/${decision}`);
      setStatus(data.data.status);
      setTaken(data.data.taken);
      setRemaining(data.data.remaining);
      showToast({ title: decision === 'approve' ? 'Allocation approved' : 'Allocation refused', variant: 'success' });
    } catch (err) {
      const axiosErr = err as AxiosError<ApiErrorBody>;
      showToast({
        title: 'Failed to update allocation',
        description: getErrorMessage(axiosErr.response?.data?.error?.code, axiosErr.response?.data?.error?.message),
        variant: 'danger',
      });
    } finally {
      setIsDeciding(false);
    }
  }

  async function handleDelete() {
    if (!allocationId) return;
    if (!window.confirm('Delete this allocation? This cannot be undone.')) return;
    setIsDeleting(true);
    try {
      await api.delete(`/time-off-allocations/${allocationId}`);
      showToast({ title: 'Allocation deleted', variant: 'success' });
      router.push('/time-off-allocations');
    } catch (err) {
      const axiosErr = err as AxiosError<ApiErrorBody>;
      showToast({
        title: 'Failed to delete allocation',
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

  if (!user || notAuthorized) {
    return (
      <Container className="py-10">
        <EmptyState title="Not authorized" description="Only HR and payroll roles can manage allocations." />
      </Container>
    );
  }

  if (mode === 'edit' && notFound) {
    return (
      <Container className="py-10">
        <EmptyState title="Allocation not found" description="It may have been removed." />
      </Container>
    );
  }

  const employeeOptions = employees.map((e) => ({ value: e.id, label: e.fullName }));
  const typeOptions = types.map((t) => ({ value: t.id, label: t.name }));

  return (
    <Container className="flex flex-col gap-6 py-10">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-2">
          <BackButton href="/time-off-allocations" label="Back to Allocations" />
          <h1 className="text-2xl font-semibold text-[var(--text-primary)]">
            {mode === 'create' ? 'New Allocation' : `Allocation / ${employeeName}`}
          </h1>
          <p className="text-xs text-[var(--text-tertiary)]">One balance grant</p>
        </div>
        {mode === 'edit' && status === 'pending' && (
          <div className="flex gap-2">
            <Button variant="danger" size="sm" onClick={() => handleDecision('refuse')} isLoading={isDeciding}>
              Refuse
            </Button>
            <Button size="sm" onClick={() => handleDecision('approve')} isLoading={isDeciding}>
              Approve
            </Button>
          </div>
        )}
      </div>

      <Card>
        <CardBody className="flex flex-col gap-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {mode === 'create' ? (
              <Select
                label="Employee *"
                placeholder="Select employee"
                options={employeeOptions}
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
              />
            ) : (
              <Input label="Employee" value={employeeName} disabled />
            )}
            {mode === 'create' ? (
              <Select
                label="Time Off Type *"
                placeholder="Select type"
                options={typeOptions}
                value={timeOffTypeId}
                onChange={(e) => setTimeOffTypeId(e.target.value)}
              />
            ) : (
              <Input label="Time Off Type" value={typeName} disabled />
            )}
            <Input label="Allocated *" type="number" min="0" value={allocated} onChange={(e) => setAllocated(e.target.value)} />
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">Status</span>
              <Badge className="w-fit" variant={STATUS_VARIANT[status]} dot>
                {status[0].toUpperCase() + status.slice(1)}
              </Badge>
            </div>
            {mode === 'edit' && (
              <>
                <Input label="Taken" value={String(taken)} disabled />
                <Input label="Remaining" value={String(remaining)} disabled />
              </>
            )}
            <Input label="Valid From" type="date" value={validFrom} onChange={(e) => setValidFrom(e.target.value)} />
            <Input label="Valid To" type="date" value={validTo} onChange={(e) => setValidTo(e.target.value)} />
          </div>

          <Textarea label="Description" value={description} onChange={(e) => setDescription(e.target.value)} />

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
              <Button variant="outline" onClick={() => router.push('/time-off-allocations')}>
                Cancel
              </Button>
              <Button onClick={handleSave} isLoading={isSubmitting}>
                {mode === 'create' ? 'Create Allocation' : 'Save'}
              </Button>
            </div>
          </div>
        </CardBody>
      </Card>
    </Container>
  );
}
