'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AxiosError } from 'axios';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';
import { getErrorMessage } from '@/lib/errorMessages';
import { Container } from '@/components/layout/Container';
import { Badge, type BadgeVariant } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from '@/components/ui/Table';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { Pagination, type PaginationMeta } from '@/components/ui/Pagination';

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
  status: 'present' | 'late' | 'absent';
  workedHours: number;
}

interface ApiErrorBody {
  error: { code: string; message: string };
}

const STATUS_VARIANT: Record<Attendance['status'], BadgeVariant> = {
  present: 'success',
  late: 'warning',
  absent: 'danger',
};
const STATUS_LABEL: Record<Attendance['status'], string> = {
  present: 'Present',
  late: 'Late',
  absent: 'Absent',
};

const STATUS_OPTIONS = [
  { value: 'present', label: 'Present' },
  { value: 'late', label: 'Late' },
  { value: 'absent', label: 'Absent' },
];

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatTime(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

export default function AttendancePage() {
  return (
    <Suspense
      fallback={
        <Container className="flex flex-col gap-3 py-10">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-64 w-full" />
        </Container>
      }
    >
      <AttendancePageContent />
    </Suspense>
  );
}

function AttendancePageContent() {
  const { user, isLoading: authLoading } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [records, setRecords] = useState<Attendance[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [employeeFilter, setEmployeeFilter] = useState(searchParams.get('employeeId') ?? '');
  const [todayOnly, setTodayOnly] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');

  const canAccess = !!user;
  const isHr = !!user && ATTENDANCE_MODULE_ROLES.includes(user.role);

  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: Record<string, string | number> = { page };
      if (employeeFilter) params.employeeId = employeeFilter;
      if (todayOnly) params.date = todayIso();
      if (statusFilter) params.status = statusFilter;
      if (search) params.search = search;

      // The employee filter dropdown is HR-only data — an Employee viewing
      // their own attendance isn't authorized to list every employee.
      const [attendanceRes, employeesRes] = await Promise.all([
        api.get<{ data: Attendance[]; meta: PaginationMeta }>('/attendance', { params }),
        isHr
          ? api.get<{ data: Employee[] }>('/employees', { params: { limit: 100 } })
          : Promise.resolve({ data: { data: [] as Employee[] } }),
      ]);
      setRecords(attendanceRes.data.data);
      setMeta(attendanceRes.data.meta);
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
  }, [employeeFilter, todayOnly, statusFilter, search, showToast, page, isHr]);

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
        {isHr && <Button onClick={() => router.push('/attendance/new')}>+ New</Button>}
        {isHr && (
          <Input
            placeholder="Search by employee name…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-64"
          />
        )}
        {isHr && (
          <Select
            placeholder="All employees"
            options={employees.map((e) => ({ value: e.id, label: e.fullName }))}
            value={employeeFilter}
            onChange={(e) => {
              setEmployeeFilter(e.target.value);
              setPage(1);
            }}
            className="w-56"
          />
        )}
        <Select
          placeholder="All statuses"
          options={STATUS_OPTIONS}
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="w-44"
        />
        <Button variant={todayOnly ? 'secondary' : 'outline'} size="sm" onClick={() => setTodayOnly((prev) => !prev)}>
          Today
        </Button>
      </div>

      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : records.length === 0 ? (
        <EmptyState
          title="No attendance records found"
          description={isHr ? 'Create a manual entry to get started.' : 'Check in from the header to get started.'}
        />
      ) : (
        <Table>
          <TableHead>
            <TableRow>
              {isHr && <TableHeaderCell>Employee</TableHeaderCell>}
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
                {isHr && <TableCell className="font-medium">{employeeNameById.get(r.employeeId) ?? '—'}</TableCell>}
                <TableCell>{r.date}</TableCell>
                <TableCell>{formatTime(r.checkIn)}</TableCell>
                <TableCell>{formatTime(r.checkOut)}</TableCell>
                <TableCell className="num">{r.workedHours}</TableCell>
                <TableCell>
                  <Badge variant={STATUS_VARIANT[r.status]} dot>
                    {STATUS_LABEL[r.status]}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {meta && <Pagination meta={meta} onPageChange={setPage} />}
    </Container>
  );
}
