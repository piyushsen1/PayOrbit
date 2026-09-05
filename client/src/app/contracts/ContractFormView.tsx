'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';
import {
  getContractStatus,
  getMockContract,
  countRunningContractsForEmployee,
  saveMockContract,
  type ContractInput,
} from '@/lib/mockContracts';
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

interface Employee {
  id: string;
  fullName: string;
  workEmail: string;
  jobPosition: string | null;
  department: string | null;
  status: 'active' | 'inactive';
}

interface WorkingSchedule {
  id: string;
  name: string;
  weeklyHours: string;
}

const CONTRACTS_MODULE_ROLES: Role[] = ['hr_manager', 'hr_payroll_user', 'hr_payroll_manager', 'admin'];

interface FormState {
  employeeName: string;
  department: string;
  jobPosition: string;
  startDate: string;
  endDate: string;
  wagePerMonth: string;
  workingScheduleName: string;
  structureType: string;
  notes: string;
}

function emptyForm(): FormState {
  return {
    employeeName: '',
    department: '',
    jobPosition: '',
    startDate: '',
    endDate: '',
    wagePerMonth: '',
    workingScheduleName: '',
    structureType: 'Employee Salary',
    notes: '',
  };
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
  const [form, setForm] = useState<FormState>(emptyForm());
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [formError, setFormError] = useState<string | undefined>();

  const canAccess = !!user && CONTRACTS_MODULE_ROLES.includes(user.role);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [employeesRes, schedulesRes] = await Promise.all([
        api.get<{ data: Employee[] }>('/employees'),
        api.get<{ data: WorkingSchedule[] }>('/working-schedules').catch(() => ({ data: { data: [] as WorkingSchedule[] } })),
      ]);
      setEmployees(employeesRes.data.data);
      setWorkingSchedules(schedulesRes.data.data);

      if (mode === 'edit' && contractId) {
        const existing = getMockContract(contractId);
        if (!existing) {
          setNotFound(true);
        } else {
          setForm({
            employeeName: existing.employeeName,
            department: existing.department ?? '',
            jobPosition: existing.jobPosition ?? '',
            startDate: existing.startDate,
            endDate: existing.endDate ?? '',
            wagePerMonth: String(existing.wagePerMonth),
            workingScheduleName: existing.workingScheduleName ?? '',
            structureType: existing.structureType,
            notes: existing.notes,
          });
        }
      }
    } finally {
      setIsLoading(false);
    }
  }, [mode, contractId]);

  useEffect(() => {
    if (canAccess) loadData();
  }, [canAccess, loadData]);

  const status = useMemo(() => getContractStatus({ endDate: form.endDate || null }), [form.endDate]);

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleEmployeeChange(employeeId: string) {
    const selected = employees.find((e) => e.id === employeeId);
    if (!selected) return;
    setForm((prev) => ({
      ...prev,
      employeeName: selected.fullName,
      department: selected.department ?? '',
      jobPosition: selected.jobPosition ?? '',
    }));
  }

  function handleSave() {
    setFormError(undefined);
    if (!form.employeeName) {
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

    if (status === 'running' && countRunningContractsForEmployee(form.employeeName, contractId) > 0) {
      setFormError(
        `${form.employeeName} already has a running contract. Set an end date on that one before making this one running.`
      );
      return;
    }

    const input: ContractInput = {
      employeeName: form.employeeName,
      department: form.department || null,
      jobPosition: form.jobPosition || null,
      startDate: form.startDate,
      endDate: form.endDate || null,
      wagePerMonth: wage,
      workingScheduleName: form.workingScheduleName || null,
      structureType: form.structureType,
      notes: form.notes,
    };

    const saved = saveMockContract(input, contractId);
    showToast({ title: mode === 'create' ? 'Contract created' : 'Contract saved', variant: 'success' });
    router.push(`/contracts/${saved.id}`);
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

  const employeeOptions = employees.map((e) => ({ value: e.id, label: e.fullName }));
  const scheduleOptions = workingSchedules.map((s) => ({ value: s.name, label: `${s.name} (${s.weeklyHours}h/week)` }));
  const selectedEmployeeId = employees.find((e) => e.fullName === form.employeeName)?.id ?? '';

  return (
    <Container className="flex flex-col gap-6 py-10">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--text-primary)]">
          {mode === 'create' ? 'New Contract' : `Contract / ${form.employeeName}`}
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
              value={selectedEmployeeId}
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
              value={form.workingScheduleName}
              onChange={(e) => setField('workingScheduleName', e.target.value)}
            />
          </div>

          <Card className="bg-[var(--surface-sunken)] shadow-none">
            <CardBody className="flex flex-col gap-3">
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">Salary Structure / Notes</h2>
              <Input
                label="Structure Type"
                value={form.structureType}
                onChange={(e) => setField('structureType', e.target.value)}
              />
              <Textarea label="Notes" value={form.notes} onChange={(e) => setField('notes', e.target.value)} />
            </CardBody>
          </Card>

          {formError && (
            <p className="rounded-2xl bg-[var(--status-danger-bg)] px-4 py-3 text-sm text-[var(--status-danger-fg)]">
              {formError}
            </p>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => router.push('/contracts')}>
              Cancel
            </Button>
            <Button onClick={handleSave}>{mode === 'create' ? 'Create Contract' : 'Save'}</Button>
          </div>
        </CardBody>
      </Card>
    </Container>
  );
}
