'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AxiosError } from 'axios';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';
import { getErrorMessage } from '@/lib/errorMessages';
import { Container } from '@/components/layout/Container';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from '@/components/ui/Table';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';

type Role = 'employee' | 'hr_manager' | 'hr_payroll_user' | 'hr_payroll_manager' | 'admin';

const PAY_RUN_ROLES: Role[] = ['hr_payroll_user', 'hr_payroll_manager', 'admin'];

interface Employee {
  id: string;
  fullName: string;
  workingScheduleId: string | null;
}

interface Contract {
  id: string;
  employeeId: string;
  startDate: string;
  endDate: string | null;
  wagePerMonth: string;
}

interface WorkingSchedule {
  id: string;
  name: string;
  weeklyHours: string;
}

interface SalaryStructure {
  id: string;
  name: string;
  active: boolean;
}

interface ApiErrorBody {
  error: { code: string; message: string };
}

/** Mirrors the server's resolveApplicableContract: latest contract overlapping the period. */
function resolveApplicableContract(contracts: Contract[], employeeId: string, periodStart: string, periodEnd: string): Contract | null {
  const candidates = contracts
    .filter((c) => c.employeeId === employeeId && c.startDate <= periodEnd && (!c.endDate || c.endDate >= periodStart))
    .sort((a, b) => (a.startDate < b.startDate ? 1 : -1));
  return candidates[0] ?? null;
}

export default function NewPayRunPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();

  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState('');
  const [salaryStructureId, setSalaryStructureId] = useState('');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [structures, setStructures] = useState<SalaryStructure[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [schedules, setSchedules] = useState<WorkingSchedule[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [formError, setFormError] = useState<string | undefined>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canAccess = !!user && PAY_RUN_ROLES.includes(user.role);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [structuresRes, employeesRes, contractsRes, schedulesRes] = await Promise.all([
        api.get<{ data: SalaryStructure[] }>('/salary-structures'),
        api.get<{ data: Employee[] }>('/employees'),
        api.get<{ data: Contract[] }>('/contracts'),
        api.get<{ data: WorkingSchedule[] }>('/working-schedules').catch(() => ({ data: { data: [] as WorkingSchedule[] } })),
      ]);
      setStructures(structuresRes.data.data.filter((s) => s.active));
      setEmployees(employeesRes.data.data);
      setContracts(contractsRes.data.data);
      setSchedules(schedulesRes.data.data);
    } catch (err) {
      const axiosErr = err as AxiosError<ApiErrorBody>;
      showToast({
        title: 'Failed to load pay run setup data',
        description: getErrorMessage(axiosErr.response?.data?.error?.code, axiosErr.response?.data?.error?.message),
        variant: 'danger',
      });
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    if (canAccess) loadData();
  }, [canAccess, loadData]);

  const scheduleNameById = useMemo(() => new Map(schedules.map((s) => [s.id, s.name])), [schedules]);

  const rows = useMemo(
    () =>
      employees.map((e) => ({
        employee: e,
        contract: resolveApplicableContract(contracts, e.id, periodStart, periodEnd),
      })),
    [employees, contracts, periodStart, periodEnd]
  );

  function handleContinue() {
    setFormError(undefined);
    if (!name.trim()) {
      setFormError('Name is required.');
      return;
    }
    if (!salaryStructureId) {
      setFormError('Select a salary structure.');
      return;
    }
    if (!periodStart || !periodEnd) {
      setFormError('Select a period start and end date.');
      return;
    }
    if (periodEnd < periodStart) {
      setFormError('Period end cannot be before period start.');
      return;
    }
    setStep(2);
  }

  function toggleEmployee(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleCreate() {
    setFormError(undefined);
    if (selectedIds.size === 0) {
      setFormError('Select at least one employee.');
      return;
    }
    setIsSubmitting(true);
    try {
      const { data } = await api.post<{ data: { id: string } }>('/pay-runs', {
        name,
        salaryStructureId,
        periodStart,
        periodEnd,
        employeeIds: Array.from(selectedIds),
      });
      showToast({ title: 'Pay run created', variant: 'success' });
      router.push(`/pay-runs/${data.data.id}`);
    } catch (err) {
      const axiosErr = err as AxiosError<ApiErrorBody>;
      setFormError(getErrorMessage(axiosErr.response?.data?.error?.code, axiosErr.response?.data?.error?.message));
    } finally {
      setIsSubmitting(false);
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
        <EmptyState title="Not authorized" description="Pay Runs is only available to payroll roles." />
      </Container>
    );
  }

  const structureOptions = structures.map((s) => ({ value: s.id, label: s.name }));

  return (
    <Container className="flex flex-col gap-6 py-10">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--text-primary)]">New Pay Run</h1>
        <p className="text-xs text-[var(--text-tertiary)]">
          {step === 1 ? 'Define payroll scope' : 'Choose who is in this run'}
        </p>
      </div>

      {step === 1 ? (
        <Card>
          <CardBody className="flex flex-col gap-4">
            <Input label="Name *" value={name} onChange={(e) => setName(e.target.value)} />
            <Select
              label="Salary Structure *"
              placeholder="Select salary structure"
              options={structureOptions}
              value={salaryStructureId}
              onChange={(e) => setSalaryStructureId(e.target.value)}
            />
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Input label="Period Start *" type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} />
              <Input label="Period End *" type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} />
            </div>

            {formError && (
              <p className="rounded-2xl bg-[var(--status-danger-bg)] px-4 py-3 text-sm text-[var(--status-danger-fg)]">
                {formError}
              </p>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => router.push('/pay-runs')}>
                Cancel
              </Button>
              <Button onClick={handleContinue}>Continue</Button>
            </div>
          </CardBody>
        </Card>
      ) : (
        <Card>
          <CardBody className="flex flex-col gap-4">
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell></TableHeaderCell>
                  <TableHeaderCell>Employee</TableHeaderCell>
                  <TableHeaderCell>Working Hours</TableHeaderCell>
                  <TableHeaderCell>Start Date</TableHeaderCell>
                  <TableHeaderCell>Wage</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map(({ employee, contract }) => (
                  <TableRow key={employee.id} className="cursor-pointer" onClick={() => toggleEmployee(employee.id)}>
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(employee.id)}
                        onChange={() => toggleEmployee(employee.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="h-4 w-4 accent-[var(--primary)]"
                      />
                    </TableCell>
                    <TableCell className="font-medium">{employee.fullName}</TableCell>
                    <TableCell>
                      {employee.workingScheduleId ? (scheduleNameById.get(employee.workingScheduleId) ?? '—') : '—'}
                    </TableCell>
                    <TableCell>{contract?.startDate ?? '—'}</TableCell>
                    <TableCell className="num">
                      {contract ? `₹${Number(contract.wagePerMonth).toLocaleString('en-IN')}` : 'No applicable contract'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {formError && (
              <p className="rounded-2xl bg-[var(--status-danger-bg)] px-4 py-3 text-sm text-[var(--status-danger-fg)]">
                {formError}
              </p>
            )}

            <div className="flex justify-between gap-2">
              <Button variant="outline" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button onClick={handleCreate} isLoading={isSubmitting}>
                Create Payrun ({selectedIds.size} selected)
              </Button>
            </div>
          </CardBody>
        </Card>
      )}
    </Container>
  );
}
