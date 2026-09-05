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
import { Avatar } from '@/components/ui/Avatar';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';

type Role = 'employee' | 'hr_manager' | 'hr_payroll_user' | 'hr_payroll_manager' | 'admin';
type Status = 'active' | 'inactive';

interface Employee {
  id: string;
  fullName: string;
  workEmail: string;
  jobPosition: string | null;
  department: string | null;
  status: Status;
  managerId: string | null;
  workingScheduleId: string | null;
  workLocation: string | null;
  company: string | null;
  phone: string | null;
  personalEmail: string | null;
  homeAddress: string | null;
  dateOfBirth: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
}

interface WorkingSchedule {
  id: string;
  name: string;
  weeklyHours: string;
}

interface ApiErrorBody {
  error: { code: string; message: string };
}

const EMPLOYEE_MODULE_ROLES: Role[] = ['hr_manager', 'hr_payroll_user', 'hr_payroll_manager', 'admin'];

interface FormState {
  fullName: string;
  workEmail: string;
  jobPosition: string;
  department: string;
  status: Status;
  managerId: string;
  workingScheduleId: string;
  workLocation: string;
  company: string;
  phone: string;
  personalEmail: string;
  homeAddress: string;
  dateOfBirth: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
}

function emptyForm(): FormState {
  return {
    fullName: '',
    workEmail: '',
    jobPosition: '',
    department: '',
    status: 'active',
    managerId: '',
    workingScheduleId: '',
    workLocation: '',
    company: '',
    phone: '',
    personalEmail: '',
    homeAddress: '',
    dateOfBirth: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
  };
}

function toFormState(employee: Employee): FormState {
  return {
    fullName: employee.fullName,
    workEmail: employee.workEmail,
    jobPosition: employee.jobPosition ?? '',
    department: employee.department ?? '',
    status: employee.status,
    managerId: employee.managerId ?? '',
    workingScheduleId: employee.workingScheduleId ?? '',
    workLocation: employee.workLocation ?? '',
    company: employee.company ?? '',
    phone: employee.phone ?? '',
    personalEmail: employee.personalEmail ?? '',
    homeAddress: employee.homeAddress ?? '',
    dateOfBirth: employee.dateOfBirth ?? '',
    emergencyContactName: employee.emergencyContactName ?? '',
    emergencyContactPhone: employee.emergencyContactPhone ?? '',
  };
}

function buildPayload(form: FormState) {
  return {
    fullName: form.fullName,
    workEmail: form.workEmail,
    jobPosition: form.jobPosition || null,
    department: form.department || null,
    status: form.status,
    managerId: form.managerId || null,
    workingScheduleId: form.workingScheduleId || null,
    workLocation: form.workLocation || null,
    company: form.company || null,
    phone: form.phone || null,
    personalEmail: form.personalEmail || null,
    homeAddress: form.homeAddress || null,
    dateOfBirth: form.dateOfBirth || null,
    emergencyContactName: form.emergencyContactName || null,
    emergencyContactPhone: form.emergencyContactPhone || null,
  };
}

export interface EmployeeFormViewProps {
  mode: 'create' | 'edit';
  employeeId?: string;
}

export function EmployeeFormView({ mode, employeeId }: EmployeeFormViewProps) {
  const { user, isLoading: authLoading } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();

  const [allEmployees, setAllEmployees] = useState<Employee[]>([]);
  const [workingSchedules, setWorkingSchedules] = useState<WorkingSchedule[]>([]);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [isEditing, setIsEditing] = useState(mode === 'create');
  const [tab, setTab] = useState('work');
  const [form, setForm] = useState<FormState>(emptyForm());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [contractsCount, setContractsCount] = useState(0);

  const canAccess = !!user && EMPLOYEE_MODULE_ROLES.includes(user.role);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [employeesRes, schedulesRes] = await Promise.all([
        api.get<{ data: Employee[] }>('/employees'),
        api.get<{ data: WorkingSchedule[] }>('/working-schedules').catch(() => ({ data: { data: [] as WorkingSchedule[] } })),
      ]);
      setAllEmployees(employeesRes.data.data);
      setWorkingSchedules(schedulesRes.data.data);

      if (mode === 'edit' && employeeId) {
        try {
          const { data } = await api.get<{ data: Employee }>(`/employees/${employeeId}`);
          setEmployee(data.data);
          setForm(toFormState(data.data));

          const contractsRes = await api
            .get<{ data: unknown[] }>('/contracts', { params: { employeeId } })
            .catch(() => ({ data: { data: [] as unknown[] } }));
          setContractsCount(contractsRes.data.data.length);
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
        title: 'Failed to load employee data',
        description: getErrorMessage(axiosErr.response?.data?.error?.code, axiosErr.response?.data?.error?.message),
        variant: 'danger',
      });
    } finally {
      setIsLoading(false);
    }
  }, [mode, employeeId, showToast]);

  useEffect(() => {
    if (canAccess) loadData();
  }, [canAccess, loadData]);

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleCancel() {
    if (employee) setForm(toFormState(employee));
    setIsEditing(false);
  }

  async function handleCreate() {
    if (!form.fullName.trim() || !form.workEmail.trim()) {
      showToast({ title: 'Full name and work email are required.', variant: 'danger' });
      return;
    }
    setIsSubmitting(true);
    try {
      const { data } = await api.post<{ data: Employee }>('/employees', buildPayload(form));
      showToast({ title: 'Employee created', variant: 'success' });
      router.push(`/employees/${data.data.id}`);
    } catch (err) {
      const axiosErr = err as AxiosError<ApiErrorBody>;
      showToast({
        title: 'Failed to create employee',
        description: getErrorMessage(axiosErr.response?.data?.error?.code, axiosErr.response?.data?.error?.message),
        variant: 'danger',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSaveEdit() {
    if (!employee) return;
    setIsSubmitting(true);
    try {
      const { data } = await api.patch<{ data: Employee }>(`/employees/${employee.id}`, buildPayload(form));
      setEmployee(data.data);
      setForm(toFormState(data.data));
      setIsEditing(false);
      showToast({ title: 'Employee updated', variant: 'success' });
    } catch (err) {
      const axiosErr = err as AxiosError<ApiErrorBody>;
      showToast({
        title: 'Failed to save changes',
        description: getErrorMessage(axiosErr.response?.data?.error?.code, axiosErr.response?.data?.error?.message),
        variant: 'danger',
      });
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
        <EmptyState title="Not authorized" description="Employees is only available to HR and payroll roles." />
      </Container>
    );
  }

  if (mode === 'edit' && notFound) {
    return (
      <Container className="py-10">
        <EmptyState title="Employee not found" description="It may have been removed." />
      </Container>
    );
  }

  const managerOptions = allEmployees
    .filter((e) => e.id !== employeeId)
    .map((e) => ({ value: e.id, label: e.fullName }));

  const scheduleOptions = workingSchedules.map((s) => ({
    value: s.id,
    label: `${s.name} (${s.weeklyHours}h/week)`,
  }));

  const readOnly = mode === 'edit' && !isEditing;

  return (
    <Container className="flex flex-col gap-6 py-10">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--text-primary)]">
            {mode === 'create' ? 'New Employee' : `Employee / ${employee?.fullName}`}
          </h1>
          <p className="text-xs text-[var(--text-tertiary)]">
            {mode === 'create' ? 'Create a new employee record' : 'Main employee form with related HR actions'}
          </p>
        </div>

        {mode === 'edit' && (
          <div className="flex items-center gap-3">
            <div className="flex gap-2">
              <Button variant="outline" size="sm" title="Available once the Time Off module ships" disabled>
                Time Off 0
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push(`/contracts?employeeId=${employeeId}`)}
              >
                Contracts {contractsCount}
              </Button>
              <Button variant="outline" size="sm" title="Available once the Attendance module ships" disabled>
                Attendance 0
              </Button>
            </div>
            {!isEditing ? (
              <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                Edit
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleCancel}>
                  Cancel
                </Button>
                <Button size="sm" onClick={handleSaveEdit} isLoading={isSubmitting}>
                  Save
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      <Card>
        <CardBody className="flex flex-col gap-6">
          <div className="flex items-center gap-4">
            <Avatar name={form.fullName || '?'} size="lg" />
            <div>
              <p className="text-lg font-semibold text-[var(--text-primary)]">{form.fullName || 'Unnamed employee'}</p>
              <p className="text-sm text-[var(--text-secondary)]">
                {form.jobPosition || '—'} • {form.department || '—'}
              </p>
              <p className="text-xs text-[var(--text-tertiary)]">
                {form.workEmail || '—'} {form.phone && `| ${form.phone}`}
              </p>
            </div>
          </div>

          {mode === 'create' && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Input
                label="Full Name *"
                value={form.fullName}
                onChange={(e) => setField('fullName', e.target.value)}
              />
              <Input
                label="Work Email *"
                type="email"
                value={form.workEmail}
                onChange={(e) => setField('workEmail', e.target.value)}
              />
            </div>
          )}

          <Tabs defaultValue="work" value={tab} onValueChange={setTab}>
            <TabsList>
              <TabsTrigger value="work">Work Information</TabsTrigger>
              <TabsTrigger value="private">Private Information</TabsTrigger>
            </TabsList>

            <TabsContent value="work">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Input
                  label="Department"
                  value={form.department}
                  disabled={readOnly}
                  onChange={(e) => setField('department', e.target.value)}
                />
                <Input
                  label="Job Position"
                  value={form.jobPosition}
                  disabled={readOnly}
                  onChange={(e) => setField('jobPosition', e.target.value)}
                />
                <Select
                  label="Manager"
                  placeholder="Select manager"
                  options={managerOptions}
                  value={form.managerId}
                  disabled={readOnly}
                  onChange={(e) => setField('managerId', e.target.value)}
                />
                <Input
                  label="Work Location"
                  value={form.workLocation}
                  disabled={readOnly}
                  onChange={(e) => setField('workLocation', e.target.value)}
                />
                <Select
                  label="Working Schedule"
                  placeholder="Select working schedule"
                  options={scheduleOptions}
                  value={form.workingScheduleId}
                  disabled={readOnly}
                  onChange={(e) => setField('workingScheduleId', e.target.value)}
                />
                {mode === 'edit' ? (
                  <div className="flex flex-col gap-1.5">
                    <span className="text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
                      Status
                    </span>
                    <button
                      type="button"
                      disabled={readOnly}
                      onClick={() => setField('status', form.status === 'active' ? 'inactive' : 'active')}
                      className="w-fit disabled:cursor-not-allowed"
                    >
                      <Badge variant={form.status === 'active' ? 'success' : 'neutral'} dot>
                        {form.status === 'active' ? 'Active' : 'Inactive'}
                      </Badge>
                    </button>
                  </div>
                ) : (
                  <div />
                )}
                <Input
                  label="Company"
                  value={form.company}
                  disabled={readOnly}
                  onChange={(e) => setField('company', e.target.value)}
                />
                {mode === 'edit' && (
                  <Input
                    label="Work Email"
                    type="email"
                    value={form.workEmail}
                    disabled={readOnly}
                    onChange={(e) => setField('workEmail', e.target.value)}
                  />
                )}
              </div>
            </TabsContent>

            <TabsContent value="private">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Input
                  label="Personal Email"
                  type="email"
                  value={form.personalEmail}
                  disabled={readOnly}
                  onChange={(e) => setField('personalEmail', e.target.value)}
                />
                <Input
                  label="Phone Number"
                  value={form.phone}
                  disabled={readOnly}
                  onChange={(e) => setField('phone', e.target.value)}
                />
                <Input
                  label="Home Address"
                  value={form.homeAddress}
                  disabled={readOnly}
                  onChange={(e) => setField('homeAddress', e.target.value)}
                />
                <Input
                  label="Date of Birth"
                  type="date"
                  value={form.dateOfBirth}
                  disabled={readOnly}
                  onChange={(e) => setField('dateOfBirth', e.target.value)}
                />
                <Input
                  label="Emergency Contact Name"
                  value={form.emergencyContactName}
                  disabled={readOnly}
                  onChange={(e) => setField('emergencyContactName', e.target.value)}
                />
                <Input
                  label="Emergency Contact Phone"
                  value={form.emergencyContactPhone}
                  disabled={readOnly}
                  onChange={(e) => setField('emergencyContactPhone', e.target.value)}
                />
              </div>
            </TabsContent>
          </Tabs>

          {mode === 'create' && (
            <div className="flex justify-end">
              <Button onClick={handleCreate} isLoading={isSubmitting}>
                Create Employee
              </Button>
            </div>
          )}
        </CardBody>
      </Card>
    </Container>
  );
}
