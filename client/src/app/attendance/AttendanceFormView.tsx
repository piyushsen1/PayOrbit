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

const ATTENDANCE_MODULE_ROLES: Role[] = ['hr_manager', 'hr_payroll_user', 'hr_payroll_manager', 'admin'];

const STATUS_OPTIONS = [
  { value: 'present', label: 'Present' },
  { value: 'absent', label: 'Absent' },
];

interface Employee {
  id: string;
  fullName: string;
  department: string | null;
  managerId: string | null;
}

interface Attendance {
  id: string;
  employeeId: string;
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  status: 'present' | 'absent';
  notes: string | null;
  workedHours: number;
  overtime: number;
}

interface ApiErrorBody {
  error: { code: string; message: string };
}

function toDatetimeLocal(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromDatetimeLocal(value: string): string | null {
  if (!value) return null;
  return new Date(value).toISOString();
}

export interface AttendanceFormViewProps {
  mode: 'create' | 'edit';
  attendanceId?: string;
}

export function AttendanceFormView({ mode, attendanceId }: AttendanceFormViewProps) {
  const { user, isLoading: authLoading } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [employeeId, setEmployeeId] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [status, setStatus] = useState<'present' | 'absent'>('present');
  const [notes, setNotes] = useState('');
  const [workedHours, setWorkedHours] = useState<number | null>(null);
  const [overtime, setOvertime] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [formError, setFormError] = useState<string | undefined>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const canAccess = !!user && ATTENDANCE_MODULE_ROLES.includes(user.role);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const employeesRes = await api.get<{ data: Employee[] }>('/employees');
      setEmployees(employeesRes.data.data);

      if (mode === 'edit' && attendanceId) {
        try {
          const { data } = await api.get<{ data: Attendance }>(`/attendance/${attendanceId}`);
          const a = data.data;
          setEmployeeId(a.employeeId);
          setDate(a.date);
          setCheckIn(toDatetimeLocal(a.checkIn));
          setCheckOut(toDatetimeLocal(a.checkOut));
          setStatus(a.status);
          setNotes(a.notes ?? '');
          setWorkedHours(a.workedHours);
          setOvertime(a.overtime);
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
        title: 'Failed to load attendance data',
        description: getErrorMessage(axiosErr.response?.data?.error?.code, axiosErr.response?.data?.error?.message),
        variant: 'danger',
      });
    } finally {
      setIsLoading(false);
    }
  }, [mode, attendanceId, showToast]);

  useEffect(() => {
    if (canAccess) loadData();
  }, [canAccess, loadData]);

  async function handleSave() {
    setFormError(undefined);
    if (mode === 'create' && !employeeId) {
      setFormError('Select an employee.');
      return;
    }
    if (!date) {
      setFormError('Date is required.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (mode === 'create') {
        await api.post('/attendance', {
          employeeId,
          date,
          checkIn: fromDatetimeLocal(checkIn),
          checkOut: fromDatetimeLocal(checkOut),
          status,
          notes: notes || null,
        });
        showToast({ title: 'Attendance record created', variant: 'success' });
      } else if (attendanceId) {
        await api.patch(`/attendance/${attendanceId}`, {
          date,
          checkIn: fromDatetimeLocal(checkIn),
          checkOut: fromDatetimeLocal(checkOut),
          status,
          notes: notes || null,
        });
        showToast({ title: 'Attendance record saved', variant: 'success' });
      }
      router.push('/attendance');
    } catch (err) {
      const axiosErr = err as AxiosError<ApiErrorBody>;
      setFormError(getErrorMessage(axiosErr.response?.data?.error?.code, axiosErr.response?.data?.error?.message));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!attendanceId) return;
    if (!window.confirm('Delete this attendance record? This cannot be undone.')) return;
    setIsDeleting(true);
    try {
      await api.delete(`/attendance/${attendanceId}`);
      showToast({ title: 'Attendance record deleted', variant: 'success' });
      router.push('/attendance');
    } catch (err) {
      const axiosErr = err as AxiosError<ApiErrorBody>;
      showToast({
        title: 'Failed to delete attendance record',
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
        <EmptyState title="Not authorized" description="Attendance is only available to HR and payroll roles." />
      </Container>
    );
  }

  if (mode === 'edit' && notFound) {
    return (
      <Container className="py-10">
        <EmptyState title="Attendance record not found" description="It may have been removed." />
      </Container>
    );
  }

  const selectedEmployee = employees.find((e) => e.id === employeeId);
  const managerName = employees.find((e) => e.id === selectedEmployee?.managerId)?.fullName ?? '—';
  const employeeOptions = employees.map((e) => ({ value: e.id, label: e.fullName }));

  return (
    <Container className="flex flex-col gap-6 py-10">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--text-primary)]">
          {mode === 'create' ? 'New Attendance Record' : `Attendance / ${selectedEmployee?.fullName ?? '—'}`}
        </h1>
        <p className="text-xs text-[var(--text-tertiary)]">One attendance record, correctable</p>
      </div>

      <Card>
        <CardBody className="flex flex-col gap-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Select
              label="Employee *"
              placeholder="Select employee"
              options={employeeOptions}
              value={employeeId}
              disabled={mode === 'edit'}
              onChange={(e) => setEmployeeId(e.target.value)}
            />
            <Input label="Date *" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            <Input label="Check In" type="datetime-local" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} />
            <Input label="Check Out" type="datetime-local" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} />
            <Input label="Department" value={selectedEmployee?.department ?? '—'} disabled />
            <Input label="Manager" value={managerName} disabled />
            <Select
              label="Status"
              options={STATUS_OPTIONS}
              value={status}
              onChange={(e) => setStatus(e.target.value as 'present' | 'absent')}
            />
            {mode === 'edit' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
                    Worked Hours
                  </span>
                  <span className="num text-sm text-[var(--text-primary)]">{workedHours ?? '—'}</span>
                </div>
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
                    Overtime
                  </span>
                  <span className="num text-sm text-[var(--text-primary)]">{overtime ?? '—'}</span>
                </div>
              </div>
            )}
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
              <Button variant="outline" onClick={() => router.push('/attendance')}>
                Cancel
              </Button>
              <Button onClick={handleSave} isLoading={isSubmitting}>
                {mode === 'create' ? 'Create Record' : 'Save'}
              </Button>
            </div>
          </div>
        </CardBody>
      </Card>
    </Container>
  );
}
