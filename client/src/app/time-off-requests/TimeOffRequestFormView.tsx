'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AxiosError } from 'axios';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';
import { getErrorMessage } from '@/lib/errorMessages';
import { Container } from '@/components/layout/Container';
import { Card, CardBody } from '@/components/ui/Card';
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
  unit: 'days' | 'hours';
}

interface TimeOffRequest {
  id: string;
  employee: { id: string; fullName: string } | null;
  timeOffType: { id: string; name: string; unit: 'days' | 'hours' } | null;
  allocation: { id: string; allocated: string; status: string } | null;
  startDate: string;
  endDate: string;
  duration: string;
  reason: string | null;
  status: 'pending' | 'approved' | 'refused';
}

interface ApiErrorBody {
  error: { code: string; message: string };
}

export interface TimeOffRequestFormViewProps {
  mode: 'create' | 'edit';
  requestId?: string;
}

export function TimeOffRequestFormView({ mode, requestId }: TimeOffRequestFormViewProps) {
  const { user, isLoading: authLoading } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [types, setTypes] = useState<TimeOffType[]>([]);
  const [typesUnavailable, setTypesUnavailable] = useState(false);
  const [employeeId, setEmployeeId] = useState('');
  const [employeeName, setEmployeeName] = useState('');
  const [timeOffTypeId, setTimeOffTypeId] = useState('');
  const [typeName, setTypeName] = useState('');
  const [unit, setUnit] = useState<'days' | 'hours'>('days');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [duration, setDuration] = useState('');
  const [reason, setReason] = useState('');
  const [status, setStatus] = useState<'pending' | 'approved' | 'refused'>('pending');
  const [allocationSummary, setAllocationSummary] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [formError, setFormError] = useState<string | undefined>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeciding, setIsDeciding] = useState(false);

  const isHr = !!user && HR_ROLES.includes(user.role);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      if (mode === 'create') {
        const promises: Promise<unknown>[] = [
          api.get<{ data: TimeOffType[] }>('/time-off-types', { params: { limit: 100 } }).then(
            (res) => setTypes(res.data.data),
            (err: AxiosError) => {
              if (err.response?.status === 403) setTypesUnavailable(true);
              else throw err;
            }
          ),
        ];
        if (isHr) {
          promises.push(
            api
              .get<{ data: Employee[] }>('/employees', { params: { limit: 100 } })
              .then((res) => setEmployees(res.data.data))
          );
        }
        await Promise.all(promises);
      } else if (requestId) {
        try {
          const { data } = await api.get<{ data: TimeOffRequest }>(`/time-off-requests/${requestId}`);
          const r = data.data;
          setEmployeeName(r.employee?.fullName ?? '—');
          setTypeName(r.timeOffType?.name ?? '—');
          setUnit(r.timeOffType?.unit ?? 'days');
          setStartDate(r.startDate);
          setEndDate(r.endDate);
          setDuration(r.duration);
          setReason(r.reason ?? '');
          setStatus(r.status);
          setAllocationSummary(r.allocation ? `${r.allocation.status} allocation (${r.allocation.allocated} allocated)` : null);
        } catch (err) {
          const axiosErr = err as AxiosError<ApiErrorBody>;
          if (axiosErr.response?.status === 404) {
            setNotFound(true);
          } else {
            throw err;
          }
        }
      }
    } catch (err) {
      const axiosErr = err as AxiosError<ApiErrorBody>;
      showToast({
        title: 'Failed to load request data',
        description: getErrorMessage(axiosErr.response?.data?.error?.code, axiosErr.response?.data?.error?.message),
        variant: 'danger',
      });
    } finally {
      setIsLoading(false);
    }
  }, [mode, requestId, isHr, showToast]);

  useEffect(() => {
    if (user) loadData();
  }, [user, loadData]);

  const selectedType = useMemo(() => types.find((t) => t.id === timeOffTypeId), [types, timeOffTypeId]);

  function handleTypeChange(id: string) {
    setTimeOffTypeId(id);
    const found = types.find((t) => t.id === id);
    if (found) setUnit(found.unit);
  }

  async function handleSave() {
    setFormError(undefined);
    if (!timeOffTypeId) {
      setFormError('Select a time off type.');
      return;
    }
    if (!startDate || !endDate) {
      setFormError('Start and end date are required.');
      return;
    }
    if (endDate < startDate) {
      setFormError('End date cannot be before start date.');
      return;
    }
    const durationValue = Number(duration);
    if (!durationValue || durationValue <= 0) {
      setFormError('Enter a valid duration.');
      return;
    }

    setIsSubmitting(true);
    try {
      const { data } = await api.post<{ data: TimeOffRequest }>('/time-off-requests', {
        employeeId: employeeId || undefined,
        timeOffTypeId,
        startDate,
        endDate,
        duration: durationValue,
        reason: reason || null,
      });
      showToast({ title: 'Request created', variant: 'success' });
      router.push(`/time-off-requests/${data.data.id}`);
    } catch (err) {
      const axiosErr = err as AxiosError<ApiErrorBody>;
      setFormError(getErrorMessage(axiosErr.response?.data?.error?.code, axiosErr.response?.data?.error?.message));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDecision(decision: 'approve' | 'refuse') {
    if (!requestId) return;
    setIsDeciding(true);
    try {
      const { data } = await api.post<{ data: TimeOffRequest }>(`/time-off-requests/${requestId}/${decision}`);
      setStatus(data.data.status);
      showToast({ title: decision === 'approve' ? 'Request approved' : 'Request refused', variant: 'success' });
    } catch (err) {
      const axiosErr = err as AxiosError<ApiErrorBody>;
      showToast({
        title: 'Failed to update request',
        description: getErrorMessage(axiosErr.response?.data?.error?.code, axiosErr.response?.data?.error?.message),
        variant: 'danger',
      });
    } finally {
      setIsDeciding(false);
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

  if (!user) {
    return (
      <Container className="py-10">
        <EmptyState title="Not authorized" description="Sign in to manage time off requests." />
      </Container>
    );
  }

  if (mode === 'edit' && notFound) {
    return (
      <Container className="py-10">
        <EmptyState title="Request not found" description="It may have been removed." />
      </Container>
    );
  }

  if (mode === 'create' && typesUnavailable) {
    return (
      <Container className="py-10">
        <EmptyState
          title="Can't file a request yet"
          description="Your role can't view the time off type catalog needed to file a request — ask HR to submit this on your behalf."
        />
      </Container>
    );
  }

  const employeeOptions = employees.map((e) => ({ value: e.id, label: e.fullName }));
  const typeOptions = types.map((t) => ({ value: t.id, label: `${t.name} (${t.unit})` }));

  return (
    <Container className="flex flex-col gap-6 py-10">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--text-primary)]">
            {mode === 'create' ? 'New Time Off Request' : `Time Off Request / ${employeeName}`}
          </h1>
          <p className="text-xs text-[var(--text-tertiary)]">One request's detail + decision</p>
        </div>
        {mode === 'edit' && isHr && status === 'pending' && (
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
              isHr ? (
                <Select
                  label="Employee"
                  placeholder="Myself (leave blank) or select someone"
                  options={employeeOptions}
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                />
              ) : (
                <Input label="Employee" value="Me" disabled />
              )
            ) : (
              <Input label="Employee" value={employeeName} disabled />
            )}

            {mode === 'create' ? (
              <Select
                label="Time Off Type *"
                placeholder="Select type"
                options={typeOptions}
                value={timeOffTypeId}
                onChange={(e) => handleTypeChange(e.target.value)}
              />
            ) : (
              <Input label="Time Off Type" value={typeName} disabled />
            )}

            <Input label="Start Date *" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} disabled={mode === 'edit' && status !== 'pending'} />
            <Input label="End Date *" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} disabled={mode === 'edit' && status !== 'pending'} />
            <Input
              label={`Duration${mode === 'create' && selectedType ? ` (${selectedType.unit})` : mode === 'edit' ? ` (${unit})` : ''}`}
              type="number"
              min="0"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              disabled={mode === 'edit' && status !== 'pending'}
            />
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">Status</span>
              <Badge className="w-fit" variant={STATUS_VARIANT[status]} dot>
                {status[0].toUpperCase() + status.slice(1)}
              </Badge>
            </div>
            {mode === 'edit' && <Input label="Allocation Used" value={allocationSummary ?? 'No allocation required'} disabled />}
          </div>

          <Textarea
            label="Reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            disabled={mode === 'edit' && status !== 'pending'}
          />

          {formError && (
            <p className="rounded-2xl bg-[var(--status-danger-bg)] px-4 py-3 text-sm text-[var(--status-danger-fg)]">
              {formError}
            </p>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => router.push('/time-off-requests')}>
              {mode === 'create' ? 'Cancel' : 'Back'}
            </Button>
            {mode === 'create' && (
              <Button onClick={handleSave} isLoading={isSubmitting}>
                Create Request
              </Button>
            )}
          </div>
        </CardBody>
      </Card>
    </Container>
  );
}
