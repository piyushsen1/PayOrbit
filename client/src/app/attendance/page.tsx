'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AxiosError } from 'axios';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';
import { getErrorMessage } from '@/lib/errorMessages';
import { Container } from '@/components/layout/Container';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from '@/components/ui/Table';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';

type Role = 'employee' | 'hr_manager' | 'hr_payroll_user' | 'hr_payroll_manager' | 'admin';

const ATTENDANCE_MODULE_ROLES: Role[] = ['hr_manager', 'hr_payroll_user', 'hr_payroll_manager', 'admin'];

interface Employee {
  id: string;
  fullName: string;
}

interface Attendance {
  id: string;
  employeeId: string;
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  status: 'present' | 'absent';
  workedHours: number;
}

interface ApiErrorBody {
  error: { code: string; message: string };
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatTime(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

export default function AttendancePage() {
  const { user, isLoading: authLoading } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();

  const [records, setRecords] = useState<Attendance[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [employeeFilter, setEmployeeFilter] = useState('');
  const [todayOnly, setTodayOnly] = useState(false);

  const canAccess = !!user && ATTENDANCE_MODULE_ROLES.includes(user.role);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: Record<string, string> = {};
      if (employeeFilter) params.employeeId = employeeFilter;
      if (todayOnly) params.date = todayIso();

      const [attendanceRes, employeesRes] = await Promise.all([
        api.get<{ data: Attendance[] }>('/attendance', { params }),
        api.get<{ data: Employee[] }>('/employees'),
      ]);
      setRecords(attendanceRes.data.data);
      setEmployees(employeesRes.data.data);
    } catch (err) {
      const axiosErr = err as AxiosError<ApiErrorBody>;
      showToast({
        title: 'Failed to load attendance',
        description: getErrorMessage(axiosErr.response?.data?.error?.code, axiosErr.response?.data?.error?.message),
        variant: 'danger',
      });
    } finally {
      setIsLoading(false);
    }
  }, [employeeFilter, todayOnly, showToast]);

  useEffect(() => {
    if (canAccess) loadData();
  }, [canAccess, loadData]);

  const employeeNameById = useMemo(() => new Map(employees.map((e) => [e.id, e.fullName])), [employees]);

  if (authLoading) return null;

  if (!canAccess) {
    return (
      <Container className="py-10">
        <EmptyState title="Not authorized" description="Attendance is only available to HR and payroll roles." />
      </Container>
    );
  }

  return (
    <Container className="flex flex-col gap-6 py-10">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--text-primary)]">Attendance</h1>
        <p className="text-xs text-[var(--text-tertiary)]">Review check-in/out data, spot exceptions</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={() => router.push('/attendance/new')}>+ New</Button>
        <Select
          placeholder="All employees"
          options={employees.map((e) => ({ value: e.id, label: e.fullName }))}
          value={employeeFilter}
          onChange={(e) => setEmployeeFilter(e.target.value)}
          className="w-56"
        />
        <Button variant={todayOnly ? 'secondary' : 'outline'} size="sm" onClick={() => setTodayOnly((prev) => !prev)}>
          Today
        </Button>
      </div>

      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : records.length === 0 ? (
        <EmptyState title="No attendance records found" description="Create a manual entry to get started." />
      ) : (
        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell>Employee</TableHeaderCell>
              <TableHeaderCell>Date</TableHeaderCell>
              <TableHeaderCell>Check In</TableHeaderCell>
              <TableHeaderCell>Check Out</TableHeaderCell>
              <TableHeaderCell>Worked Hours</TableHeaderCell>
              <TableHeaderCell>Status</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {records.map((r) => (
              <TableRow key={r.id} className="cursor-pointer" onClick={() => router.push(`/attendance/${r.id}`)}>
                <TableCell className="font-medium">{employeeNameById.get(r.employeeId) ?? '—'}</TableCell>
                <TableCell>{r.date}</TableCell>
                <TableCell>{formatTime(r.checkIn)}</TableCell>
                <TableCell>{formatTime(r.checkOut)}</TableCell>
                <TableCell className="num">{r.workedHours}</TableCell>
                <TableCell>
                  <Badge variant={r.status === 'present' ? 'success' : 'danger'} dot>
                    {r.status === 'present' ? 'Present' : 'Absent'}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Container>
  );
}
