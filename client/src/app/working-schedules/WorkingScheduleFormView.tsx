'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
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
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';

type Role = 'employee' | 'hr_manager' | 'hr_payroll_user' | 'hr_payroll_manager' | 'admin';
type Status = 'active' | 'inactive';

const WORKING_SCHEDULE_MODULE_ROLES: Role[] = ['hr_manager', 'hr_payroll_user', 'hr_payroll_manager', 'admin'];

const DAY_OPTIONS = [
  { value: 'monday', label: 'Monday' },
  { value: 'tuesday', label: 'Tuesday' },
  { value: 'wednesday', label: 'Wednesday' },
  { value: 'thursday', label: 'Thursday' },
  { value: 'friday', label: 'Friday' },
  { value: 'saturday', label: 'Saturday' },
  { value: 'sunday', label: 'Sunday' },
];

interface DayRow {
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  breakMinutes: string;
}

interface WorkingScheduleDay {
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  breakMinutes: number;
}

interface WorkingSchedule {
  id: string;
  name: string;
  company: string;
  timezone: string;
  status: Status;
  weeklyHours: string;
  days: WorkingScheduleDay[];
}

interface ApiErrorBody {
  error: { code: string; message: string };
}

function defaultDayRow(): DayRow {
  return { dayOfWeek: 'monday', startTime: '09:00', endTime: '18:00', breakMinutes: '60' };
}

/** Mirrors the server's computeWeeklyHours, for a live preview as days are edited. */
function computeWeeklyHours(days: DayRow[]): string {
  const totalMinutes = days.reduce((sum, day) => {
    if (!day.startTime || !day.endTime) return sum;
    const [startH, startM] = day.startTime.split(':').map(Number);
    const [endH, endM] = day.endTime.split(':').map(Number);
    const minutes = endH * 60 + endM - (startH * 60 + startM) - (Number(day.breakMinutes) || 0);
    return sum + Math.max(minutes, 0);
  }, 0);
  return (totalMinutes / 60).toFixed(2);
}

export interface WorkingScheduleFormViewProps {
  mode: 'create' | 'edit';
  scheduleId?: string;
}

export function WorkingScheduleFormView({ mode, scheduleId }: WorkingScheduleFormViewProps) {
  const { user, isLoading: authLoading } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();

  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [timezone, setTimezone] = useState('UTC');
  const [status, setStatus] = useState<Status>('active');
  const [days, setDays] = useState<DayRow[]>([defaultDayRow()]);
  const [isLoading, setIsLoading] = useState(mode === 'edit');
  const [notFound, setNotFound] = useState(false);
  const [formError, setFormError] = useState<string | undefined>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const canAccess = !!user && WORKING_SCHEDULE_MODULE_ROLES.includes(user.role);

  const loadData = useCallback(async () => {
    if (mode !== 'edit' || !scheduleId) return;
    setIsLoading(true);
    try {
      const { data } = await api.get<{ data: WorkingSchedule }>(`/working-schedules/${scheduleId}`);
      const s = data.data;
      setName(s.name);
      setCompany(s.company);
      setTimezone(s.timezone);
      setStatus(s.status);
      setDays(
        s.days.map((d) => ({
          dayOfWeek: d.dayOfWeek,
          startTime: d.startTime.slice(0, 5),
          endTime: d.endTime.slice(0, 5),
          breakMinutes: String(d.breakMinutes),
        }))
      );
    } catch (err) {
      const axiosErr = err as AxiosError<ApiErrorBody>;
      if (axiosErr.response?.status === 404) {
        setNotFound(true);
      } else {
        showToast({
          title: 'Failed to load working schedule',
          description: getErrorMessage(axiosErr.response?.data?.error?.code, axiosErr.response?.data?.error?.message),
          variant: 'danger',
        });
      }
    } finally {
      setIsLoading(false);
    }
  }, [mode, scheduleId, showToast]);

  useEffect(() => {
    if (canAccess) loadData();
  }, [canAccess, loadData]);

  const weeklyHours = useMemo(() => computeWeeklyHours(days), [days]);

  function updateDay(index: number, patch: Partial<DayRow>) {
    setDays((prev) => prev.map((d, i) => (i === index ? { ...d, ...patch } : d)));
  }

  function addDay() {
    setDays((prev) => [...prev, defaultDayRow()]);
  }

  function removeDay(index: number) {
    setDays((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSave() {
    setFormError(undefined);
    if (!name.trim()) {
      setFormError('Schedule name is required.');
      return;
    }
    if (!company.trim()) {
      setFormError('Company is required.');
      return;
    }
    if (days.length === 0) {
      setFormError('Add at least one day.');
      return;
    }

    const payload = {
      name,
      company,
      timezone,
      status,
      days: days.map((d) => ({
        dayOfWeek: d.dayOfWeek,
        startTime: d.startTime,
        endTime: d.endTime,
        breakMinutes: Number(d.breakMinutes) || 0,
      })),
    };

    setIsSubmitting(true);
    try {
      if (mode === 'create') {
        const { data } = await api.post<{ data: WorkingSchedule }>('/working-schedules', payload);
        showToast({ title: 'Working schedule created', variant: 'success' });
        router.push(`/working-schedules/${data.data.id}`);
      } else if (scheduleId) {
        await api.patch<{ data: WorkingSchedule }>(`/working-schedules/${scheduleId}`, payload);
        showToast({ title: 'Working schedule saved', variant: 'success' });
        router.push('/working-schedules');
      }
    } catch (err) {
      const axiosErr = err as AxiosError<ApiErrorBody>;
      setFormError(getErrorMessage(axiosErr.response?.data?.error?.code, axiosErr.response?.data?.error?.message));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!scheduleId) return;
    if (!window.confirm('Delete this working schedule? This cannot be undone.')) return;
    setIsDeleting(true);
    try {
      await api.delete(`/working-schedules/${scheduleId}`);
      showToast({ title: 'Working schedule deleted', variant: 'success' });
      router.push('/working-schedules');
    } catch (err) {
      const axiosErr = err as AxiosError<ApiErrorBody>;
      showToast({
        title: 'Failed to delete working schedule',
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
        <EmptyState title="Not authorized" description="Working Schedules is only available to HR and payroll roles." />
      </Container>
    );
  }

  if (mode === 'edit' && notFound) {
    return (
      <Container className="py-10">
        <EmptyState title="Working schedule not found" description="It may have been removed." />
      </Container>
    );
  }

  return (
    <Container className="flex flex-col gap-6 py-10">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--text-primary)]">
          {mode === 'create' ? 'New Working Schedule' : `Working Schedule / ${name}`}
        </h1>
        <p className="text-xs text-[var(--text-tertiary)]">Define one weekly pattern</p>
      </div>

      <Card>
        <CardBody className="flex flex-col gap-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Input label="Schedule Name *" value={name} onChange={(e) => setName(e.target.value)} />
            <Input label="Company *" value={company} onChange={(e) => setCompany(e.target.value)} />
            <Input label="Timezone" value={timezone} onChange={(e) => setTimezone(e.target.value)} />
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">Status</span>
              <button
                type="button"
                onClick={() => setStatus((prev) => (prev === 'active' ? 'inactive' : 'active'))}
                className="w-fit"
              >
                <Badge variant={status === 'active' ? 'success' : 'neutral'} dot>
                  {status === 'active' ? 'Active' : 'Inactive'}
                </Badge>
              </button>
            </div>
          </div>

          <Card className="bg-[var(--surface-sunken)] shadow-none">
            <CardBody className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-[var(--text-primary)]">Days</h2>
                <span className="text-sm text-[var(--text-secondary)]">
                  Hours/Week: <span className="num font-semibold">{weeklyHours}</span> (auto-computed)
                </span>
              </div>

              <div className="flex flex-col gap-3">
                {days.map((day, index) => (
                  <div key={index} className="grid grid-cols-2 gap-3 rounded-xl bg-[var(--surface-card)] p-3 md:grid-cols-5 md:items-end">
                    <Select
                      label="Day"
                      options={DAY_OPTIONS}
                      value={day.dayOfWeek}
                      onChange={(e) => updateDay(index, { dayOfWeek: e.target.value })}
                    />
                    <Input
                      label="Start"
                      type="time"
                      value={day.startTime}
                      onChange={(e) => updateDay(index, { startTime: e.target.value })}
                    />
                    <Input
                      label="End"
                      type="time"
                      value={day.endTime}
                      onChange={(e) => updateDay(index, { endTime: e.target.value })}
                    />
                    <Input
                      label="Break (min)"
                      type="number"
                      min="0"
                      value={day.breakMinutes}
                      onChange={(e) => updateDay(index, { breakMinutes: e.target.value })}
                    />
                    <Button variant="outline" size="sm" onClick={() => removeDay(index)} disabled={days.length === 1}>
                      Remove
                    </Button>
                  </div>
                ))}
              </div>

              <Button variant="outline" size="sm" onClick={addDay} className="w-fit">
                + Add Day
              </Button>
            </CardBody>
          </Card>

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
              <Button variant="outline" onClick={() => router.push('/working-schedules')}>
                Cancel
              </Button>
              <Button onClick={handleSave} isLoading={isSubmitting}>
                {mode === 'create' ? 'Create Schedule' : 'Save'}
              </Button>
            </div>
          </div>
        </CardBody>
      </Card>
    </Container>
  );
}
