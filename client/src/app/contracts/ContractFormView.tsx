'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
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
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';

type Role = 'employee' | 'hr_manager' | 'hr_payroll_user' | 'hr_payroll_manager' | 'admin';

interface Employee {
  id: string;
  fullName: string;
  department: string | null;
  jobPosition: string | null;
  status?: 'active' | 'inactive';
}

interface WorkingSchedule {
  id: string;
  name: string;
  weeklyHours: string;
  status?: 'active' | 'inactive';
}

interface SalaryStructure {
  id: string;
  name: string;
  active: boolean;
}

interface Contract {
  id: string;
  contractNumber: string;
  employeeId: string;
  department: string | null;
  jobPosition: string | null;
  startDate: string;
  endDate: string | null;
  wagePerMonth: string;
  workingScheduleId: string | null;
  salaryStructureId: string | null;
  notes: string;
  status: 'running' | 'expired';
}

interface ApiErrorBody {
  error: { code: string; message: string };
}

const CONTRACTS_MODULE_ROLES: Role[] = ['hr_manager', 'hr_payroll_user', 'hr_payroll_manager', 'admin'];

interface FormState {
  employeeId: string;
  department: string;
  jobPosition: string;
  startDate: string;
  endDate: string;
  wagePerMonth: string;
  workingScheduleId: string;
  salaryStructureId: string;
  notes: string;
}

function emptyForm(): FormState {
  return {
    employeeId: '',
    department: '',
    jobPosition: '',
    startDate: '',
    endDate: '',
    wagePerMonth: '',
    workingScheduleId: '',
    salaryStructureId: '',
    notes: '',
  };
}

function computeStatus(endDate: string): 'running' | 'expired' {
  if (!endDate) return 'running';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(endDate) < today ? 'expired' : 'running';
}

export interface ContractFormViewProps {
  mode: 'create' | 'edit';
  contractId?: string;
}

export function ContractFormView({ mode, contractId }: ContractFormViewProps) {
  const { user, isLoading: authLoading } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [workingSchedules, setWorkingSchedules] = useState<WorkingSchedule[]>([]);
  const [salaryStructures, setSalaryStructures] = useState<SalaryStructure[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [formError, setFormError] = useState<string | undefined>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const canAccess = !!user && CONTRACTS_MODULE_ROLES.includes(user.role);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      let contractData: Contract | null = null;

      if (mode === 'edit' && contractId) {
        try {
          const { data } = await api.get<{ data: Contract }>(`/contracts/${contractId}`);
          contractData = data.data;
        } catch (err) {
          const axiosErr = err as AxiosError<ApiErrorBody>;
          if (axiosErr.response?.status === 404) {
            setNotFound(true);
            return;
          }
          throw err;
        }
      }

      const [employeesRes, schedulesRes, structuresRes] = await Promise.all([
        api.get<{ data: Employee[] }>('/employees', { params: { limit: 100, status: 'active' } }),
        api
          .get<{ data: WorkingSchedule[] }>('/working-schedules', { params: { limit: 100, status: 'active' } })
          .catch(() => ({ data: { data: [] as WorkingSchedule[] } })),
        api
          .get<{ data: SalaryStructure[] }>('/salary-structures', { params: { limit: 100 } })
          .catch(() => ({ data: { data: [] as SalaryStructure[] } })),
      ]);

      let employeesList = employeesRes.data.data;
      let schedules = schedulesRes.data.data;

      // Preserve the contract's currently-assigned employee/working schedule
      // even if they've since gone inactive — this select is read-only in
      // edit mode, but it (and the page header) must still show the real
      // assignment rather than silently dropping it from the option list.
      const contractEmployeeId = contractData?.employeeId;
      if (contractEmployeeId && !employeesList.some((e) => e.id === contractEmployeeId)) {
        try {
          const { data } = await api.get<{ data: Employee }>(`/employees/${contractEmployeeId}`);
          employeesList = [...employeesList, data.data];
        } catch {
          // employee record unavailable — leave options as-is
        }
      }

      const contractScheduleId = contractData?.workingScheduleId;
      if (contractScheduleId && !schedules.some((s) => s.id === contractScheduleId)) {
        try {
          const { data } = await api.get<{ data: WorkingSchedule }>(`/working-schedules/${contractScheduleId}`);
          schedules = [...schedules, data.data];
        } catch {
          // schedule record unavailable — leave options as-is
        }
      }

      setEmployees(employeesList);
      setWorkingSchedules(schedules);
      setSalaryStructures(structuresRes.data.data);

      if (contractData) {
        const c = contractData;
        setForm({
          employeeId: c.employeeId,
          department: c.department ?? '',
          jobPosition: c.jobPosition ?? '',
          startDate: c.startDate,
          endDate: c.endDate ?? '',
          wagePerMonth: c.wagePerMonth,
          workingScheduleId: c.workingScheduleId ?? '',
          salaryStructureId: c.salaryStructureId ?? '',
          notes: c.notes,
        });
      }
    } catch (err) {
      const axiosErr = err as AxiosError<ApiErrorBody>;
      showToast({
        title: 'Failed to load contract data',
        description: getErrorMessage(axiosErr.response?.data?.error?.code, axiosErr.response?.data?.error?.message),
        variant: 'danger',
      });
    } finally {
      setIsLoading(false);
    }
  }, [mode, contractId, showToast]);

  useEffect(() => {
    if (canAccess) loadData();
  }, [canAccess, loadData]);

  const status = useMemo(() => computeStatus(form.endDate), [form.endDate]);

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleEmployeeChange(employeeId: string) {
    const selected = employees.find((e) => e.id === employeeId);
    setForm((prev) => ({
      ...prev,
      employeeId,
      department: selected?.department ?? '',
      jobPosition: selected?.jobPosition ?? '',
    }));
  }

  async function handleSave() {
    setFormError(undefined);
    if (!form.employeeId) {
      setFormError('Select an employee.');
      return;
    }
    if (!form.startDate) {
      setFormError('Start date is required.');
      return;
    }
    const wage = Number(form.wagePerMonth);
    if (!wage || wage <= 0) {
      setFormError('Enter a valid wage per month.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (mode === 'create') {
        const { data } = await api.post<{ data: Contract }>('/contracts', {
          employeeId: form.employeeId,
          startDate: form.startDate,
          endDate: form.endDate || null,
          wagePerMonth: wage,
          workingScheduleId: form.workingScheduleId || null,
          salaryStructureId: form.salaryStructureId || null,
          notes: form.notes,
        });
        showToast({ title: 'Contract created', variant: 'success' });
        router.push(`/contracts/${data.data.id}`);
      } else if (contractId) {
        const { data } = await api.patch<{ data: Contract }>(`/contracts/${contractId}`, {
          startDate: form.startDate,
          endDate: form.endDate || null,
          wagePerMonth: wage,
          workingScheduleId: form.workingScheduleId || null,
          salaryStructureId: form.salaryStructureId || null,
          notes: form.notes,
        });
        showToast({ title: 'Contract saved', variant: 'success' });
        router.push(`/contracts/${data.data.id}`);
      }
    } catch (err) {
      const axiosErr = err as AxiosError<ApiErrorBody>;
      setFormError(getErrorMessage(axiosErr.response?.data?.error?.code, axiosErr.response?.data?.error?.message));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!contractId) return;
    if (!window.confirm('Delete this contract? This cannot be undone.')) return;
    setIsDeleting(true);
    try {
      await api.delete(`/contracts/${contractId}`);
      showToast({ title: 'Contract deleted', variant: 'success' });
      router.push('/contracts');
    } catch (err) {
      const axiosErr = err as AxiosError<ApiErrorBody>;
      showToast({
        title: 'Failed to delete contract',
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
        <EmptyState title="Not authorized" description="Contracts is only available to HR and payroll roles." />
      </Container>
    );
  }

  if (mode === 'edit' && notFound) {
    return (
      <Container className="py-10">
        <EmptyState title="Contract not found" description="It may have been removed." />
      </Container>
    );
  }

  const employeeOptions = employees.map((e) => ({
    value: e.id,
    label: e.status === 'inactive' ? `${e.fullName} (Inactive)` : e.fullName,
  }));
  const scheduleOptions = workingSchedules.map((s) => ({
    value: s.id,
    label:
      s.status === 'inactive'
        ? `${s.name} (${s.weeklyHours}h/week) (Inactive)`
        : `${s.name} (${s.weeklyHours}h/week)`,
  }));
  const structureOptions = salaryStructures.filter((s) => s.active).map((s) => ({ value: s.id, label: s.name }));
  const employeeName = employees.find((e) => e.id === form.employeeId)?.fullName ?? '';

  return (
    <Container className="flex flex-col gap-6 py-10">
      <div className="flex flex-col gap-2">
        <BackButton href="/contracts" label="Back to Contracts" />
        <h1 className="text-2xl font-semibold text-[var(--text-primary)]">
          {mode === 'create' ? 'New Contract' : `Contract / ${employeeName || '—'}`}
        </h1>
        <p className="text-xs text-[var(--text-tertiary)]">Form view of one contract</p>
      </div>

      <Card>
        <CardBody className="flex flex-col gap-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Select
              label="Employee *"
              placeholder="Select employee"
              options={employeeOptions}
              value={form.employeeId}
              disabled={mode === 'edit'}
              onChange={(e) => handleEmployeeChange(e.target.value)}
            />
            <Input label="Department" value={form.department} disabled />
            <Input label="Start Date *" type="date" value={form.startDate} onChange={(e) => setField('startDate', e.target.value)} />
            <Input label="Job Position" value={form.jobPosition} disabled />
            <Input label="End Date" type="date" value={form.endDate} onChange={(e) => setField('endDate', e.target.value)} />
            <Input
              label="Wage / Month"
              type="number"
              min="0"
              value={form.wagePerMonth}
              onChange={(e) => setField('wagePerMonth', e.target.value)}
            />
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">Status</span>
              <Badge className="w-fit" variant={status === 'running' ? 'success' : 'danger'} dot>
                {status === 'running' ? 'Running' : 'Expired'}
              </Badge>
            </div>
            <Select
              label="Working Schedule"
              placeholder="Select working schedule"
              options={scheduleOptions}
              value={form.workingScheduleId}
              onChange={(e) => setField('workingScheduleId', e.target.value)}
            />
          </div>

          <Card className="bg-[var(--surface-sunken)] shadow-none">
            <CardBody className="flex flex-col gap-3">
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">Salary Structure / Notes</h2>
              <Select
                label="Salary Structure"
                placeholder="Select salary structure"
                options={structureOptions}
                value={form.salaryStructureId}
                onChange={(e) => setField('salaryStructureId', e.target.value)}
              />
              <Textarea label="Notes" value={form.notes} onChange={(e) => setField('notes', e.target.value)} />
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
              <Button variant="outline" onClick={() => router.push('/contracts')}>
                Cancel
              </Button>
              <Button onClick={handleSave} isLoading={isSubmitting}>
                {mode === 'create' ? 'Create Contract' : 'Save'}
              </Button>
            </div>
          </div>
        </CardBody>
      </Card>
    </Container>
  );
}
