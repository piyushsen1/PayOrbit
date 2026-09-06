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
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';

type Role = 'employee' | 'hr_manager' | 'hr_payroll_user' | 'hr_payroll_manager' | 'admin';

const MANAGE_ROLES: Role[] = ['hr_manager', 'hr_payroll_user', 'hr_payroll_manager', 'admin'];

interface Holiday {
  id: string;
  name: string;
  date: string;
  recurring: boolean;
  notes: string | null;
}

interface ApiErrorBody {
  error: { code: string; message: string };
}

export interface HolidayFormViewProps {
  mode: 'create' | 'edit';
  holidayId?: string;
}

export function HolidayFormView({ mode, holidayId }: HolidayFormViewProps) {
  const { user, isLoading: authLoading } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();

  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [recurring, setRecurring] = useState(false);
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(mode === 'edit');
  const [notFound, setNotFound] = useState(false);
  const [formError, setFormError] = useState<string | undefined>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const canManage = !!user && MANAGE_ROLES.includes(user.role);

  const loadData = useCallback(async () => {
    if (mode !== 'edit' || !holidayId) return;
    setIsLoading(true);
    try {
      const { data } = await api.get<{ data: Holiday }>(`/holidays/${holidayId}`);
      setName(data.data.name);
      setDate(data.data.date);
      setRecurring(data.data.recurring);
      setNotes(data.data.notes ?? '');
    } catch (err) {
      const axiosErr = err as AxiosError<ApiErrorBody>;
      if (axiosErr.response?.status === 404) {
        setNotFound(true);
      } else {
        showToast({
          title: 'Failed to load holiday',
          description: getErrorMessage(axiosErr.response?.data?.error?.code, axiosErr.response?.data?.error?.message),
          variant: 'danger',
        });
      }
    } finally {
      setIsLoading(false);
    }
  }, [mode, holidayId, showToast]);

  useEffect(() => {
    if (canManage) loadData();
  }, [canManage, loadData]);

  async function handleSave() {
    setFormError(undefined);
    if (!name.trim()) {
      setFormError('Holiday name is required.');
      return;
    }
    if (!date) {
      setFormError('Date is required.');
      return;
    }

    const payload = { name, date, recurring, notes: notes || null };

    setIsSubmitting(true);
    try {
      if (mode === 'create') {
        await api.post('/holidays', payload);
        showToast({ title: 'Holiday created', variant: 'success' });
      } else if (holidayId) {
        await api.patch(`/holidays/${holidayId}`, payload);
        showToast({ title: 'Holiday saved', variant: 'success' });
      }
      router.push('/holidays');
    } catch (err) {
      const axiosErr = err as AxiosError<ApiErrorBody>;
      setFormError(getErrorMessage(axiosErr.response?.data?.error?.code, axiosErr.response?.data?.error?.message));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!holidayId) return;
    if (!window.confirm('Delete this holiday? This cannot be undone.')) return;
    setIsDeleting(true);
    try {
      await api.delete(`/holidays/${holidayId}`);
      showToast({ title: 'Holiday deleted', variant: 'success' });
      router.push('/holidays');
    } catch (err) {
      const axiosErr = err as AxiosError<ApiErrorBody>;
      showToast({
        title: 'Failed to delete holiday',
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

  if (!canManage) {
    return (
      <Container className="py-10">
        <EmptyState title="Not authorized" description="Managing holidays is only available to HR and payroll roles." />
      </Container>
    );
  }

  if (mode === 'edit' && notFound) {
    return (
      <Container className="py-10">
        <EmptyState title="Holiday not found" description="It may have been removed." />
      </Container>
    );
  }

  return (
    <Container className="flex flex-col gap-6 py-10">
      <div className="flex flex-col gap-2">
        <BackButton href="/holidays" label="Back to Holidays" />
        <h1 className="text-2xl font-semibold text-[var(--text-primary)]">
          {mode === 'create' ? 'New Holiday' : `Holiday / ${name}`}
        </h1>
        <p className="text-xs text-[var(--text-tertiary)]">Visible to everyone on the company calendar</p>
      </div>

      <Card>
        <CardBody className="flex flex-col gap-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Input label="Holiday Name *" value={name} onChange={(e) => setName(e.target.value)} />
            <Input label="Date *" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
                Repeats every year
              </span>
              <button type="button" onClick={() => setRecurring((prev) => !prev)} className="w-fit">
                <Badge variant={recurring ? 'info' : 'neutral'} dot>
                  {recurring ? 'Yearly' : 'One-time'}
                </Badge>
              </button>
            </div>
          </div>

          <Textarea label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} />

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
              <Button variant="outline" onClick={() => router.push('/holidays')}>
                Cancel
              </Button>
              <Button onClick={handleSave} isLoading={isSubmitting}>
                {mode === 'create' ? 'Create Holiday' : 'Save'}
              </Button>
            </div>
          </div>
        </CardBody>
      </Card>
    </Container>
  );
}
