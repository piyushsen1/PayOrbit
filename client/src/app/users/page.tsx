'use client';

import { useCallback, useEffect, useState } from 'react';
import { AxiosError } from 'axios';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { getErrorMessage } from '@/lib/errorMessages';
import { Container } from '@/components/layout/Container';
import { Card, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { RadioGroup } from '@/components/ui/RadioGroup';
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from '@/components/ui/Table';
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
}

interface UserAccount {
  id: string;
  email: string;
  role: Role;
  status: Status;
  employeeId: string | null;
  employee: Employee | null;
}

interface ApiErrorBody {
  error: { code: string; message: string };
}

const ROLE_OPTIONS: { value: Role; label: string }[] = [
  { value: 'employee', label: 'Employee' },
  { value: 'hr_manager', label: 'HR Manager' },
  { value: 'hr_payroll_user', label: 'HR Payroll User' },
  { value: 'hr_payroll_manager', label: 'HR Payroll Manager' },
  { value: 'admin', label: 'Admin' },
];

const ROLE_LABELS = Object.fromEntries(ROLE_OPTIONS.map((o) => [o.value, o.label])) as Record<Role, string>;

function emptyForm() {
  return { employeeId: '', email: '', role: 'employee' as Role, status: 'active' as Status };
}

export default function UserManagementPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { showToast } = useToast();

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [formError, setFormError] = useState<string | undefined>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isAdmin = user?.role === 'admin';

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [employeesRes, usersRes] = await Promise.all([
        api.get<{ data: Employee[] }>('/employees'),
        api.get<{ data: UserAccount[] }>('/users'),
      ]);
      setEmployees(employeesRes.data.data);
      setUsers(usersRes.data.data);
    } catch (err) {
      const axiosErr = err as AxiosError<ApiErrorBody>;
      showToast({
        title: 'Failed to load users',
        description: getErrorMessage(axiosErr.response?.data?.error?.code, axiosErr.response?.data?.error?.message),
        variant: 'danger',
      });
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    if (isAdmin) loadData();
  }, [isAdmin, loadData]);

  function startCreate() {
    setEditingId(null);
    setForm(emptyForm());
    setFormError(undefined);
  }

  function startEdit(u: UserAccount) {
    setEditingId(u.id);
    setForm({ employeeId: u.employeeId ?? '', email: u.email, role: u.role, status: u.status });
    setFormError(undefined);
  }

  function handleEmployeeChange(employeeId: string) {
    const employee = employees.find((e) => e.id === employeeId);
    setForm((prev) => ({
      ...prev,
      employeeId,
      email: prev.email || employee?.workEmail || '',
    }));
  }

  async function handleSubmit() {
    setFormError(undefined);
    if (!form.employeeId) {
      setFormError('Select an employee.');
      return;
    }
    if (!form.email) {
      setFormError('Work email is required.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingId) {
        await api.patch(`/users/${editingId}`, form);
        showToast({ title: 'Access saved', variant: 'success' });
      } else {
        const { data } = await api.post<{ data: { user: UserAccount; temporaryPassword: string } }>('/users', form);
        showToast({
          title: 'User created',
          description: `Temporary password: ${data.data.temporaryPassword} — share this with the user; there is no invite email yet.`,
          variant: 'success',
          durationMs: 15000,
        });
      }
      startCreate();
      await loadData();
    } catch (err) {
      const axiosErr = err as AxiosError<ApiErrorBody>;
      setFormError(getErrorMessage(axiosErr.response?.data?.error?.code, axiosErr.response?.data?.error?.message));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (authLoading) {
    return (
      <Container className="flex flex-col gap-3 py-10">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </Container>
    );
  }

  if (!isAdmin) {
    return (
      <Container className="py-10">
        <EmptyState title="Not authorized" description="User Management is only available to Admins." />
      </Container>
    );
  }

  const filteredUsers = users.filter((u) => {
    const matchesRole = !roleFilter || u.role === roleFilter;
    const haystack = `${u.employee?.fullName ?? ''} ${u.email}`.toLowerCase();
    const matchesSearch = !search || haystack.includes(search.toLowerCase());
    return matchesRole && matchesSearch;
  });

  return (
    <Container className="flex flex-col gap-6 py-10">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-semibold text-[var(--text-primary)]">User Management</h1>
        <Badge variant="info">Admin Only</Badge>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={startCreate}>+ New User</Button>

            <div className="flex min-w-[260px] flex-1 items-center gap-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] px-4 py-3">
              <svg
                viewBox="0 0 20 20"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                className="h-4 w-4 shrink-0 text-[var(--text-tertiary)]"
              >
                <circle cx="9" cy="9" r="6" />
                <path d="M17 17l-4-4" strokeLinecap="round" />
              </svg>
              <input
                placeholder="Search users, employees or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-transparent text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-tertiary)]"
              />
            </div>

            <Select
              options={[{ value: '', label: 'All roles' }, ...ROLE_OPTIONS]}
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              aria-label="Role Filter"
              className="w-48"
            />
          </div>

          {isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : filteredUsers.length === 0 ? (
            <EmptyState title="No users yet" description="Create the first user account to get started." />
          ) : (
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>User</TableHeaderCell>
                  <TableHeaderCell>Employee</TableHeaderCell>
                  <TableHeaderCell>Work Email</TableHeaderCell>
                  <TableHeaderCell>Role</TableHeaderCell>
                  <TableHeaderCell>Status</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredUsers.map((u) => (
                  <TableRow
                    key={u.id}
                    onClick={() => startEdit(u)}
                    className={cn('cursor-pointer', editingId === u.id && 'bg-[var(--surface-sunken)]')}
                  >
                    <TableCell>{u.employee?.fullName ?? '—'}</TableCell>
                    <TableCell>{u.employee?.fullName ?? '—'}</TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell>{ROLE_LABELS[u.role]}</TableCell>
                    <TableCell>
                      <Badge variant={u.status === 'active' ? 'success' : 'neutral'} dot>
                        {u.status === 'active' ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          <p className="text-xs text-[var(--text-tertiary)]">Select a user to edit access, or create a new user.</p>
          <p className="text-xs text-[var(--text-tertiary)]">
            User accounts are separate from Employee records, but should be linked to an employee for access and
            ownership.
          </p>
        </div>

        <Card className="h-fit">
          <CardBody className="flex flex-col gap-4">
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">Create / Edit User</h2>

            <Select
              label="Employee *"
              placeholder="Select employee"
              options={employees.map((e) => ({ value: e.id, label: e.fullName }))}
              value={form.employeeId}
              onChange={(e) => handleEmployeeChange(e.target.value)}
            />

            <Input
              label="Work Email *"
              type="email"
              placeholder="employee@company.com"
              value={form.email}
              onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
            />

            <RadioGroup
              label="Roles *"
              name="role"
              options={ROLE_OPTIONS}
              value={form.role}
              onChange={(value) => setForm((prev) => ({ ...prev, role: value as Role }))}
            />

            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
                Account Status
              </span>
              <button
                type="button"
                onClick={() => setForm((prev) => ({ ...prev, status: prev.status === 'active' ? 'inactive' : 'active' }))}
              >
                <Badge variant={form.status === 'active' ? 'success' : 'neutral'} dot>
                  {form.status === 'active' ? 'Active' : 'Inactive'}
                </Badge>
              </button>
            </div>

            {formError && (
              <p className="rounded-2xl bg-[var(--status-danger-bg)] px-4 py-3 text-sm text-[var(--status-danger-fg)]">
                {formError}
              </p>
            )}

            <Button onClick={handleSubmit} size="lg" isLoading={isSubmitting}>
              Create User / Save Access
            </Button>
          </CardBody>
        </Card>
      </div>
    </Container>
  );
}
