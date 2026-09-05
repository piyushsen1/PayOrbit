'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AxiosError } from 'axios';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';
import { getErrorMessage } from '@/lib/errorMessages';
import { Container } from '@/components/layout/Container';
import { Badge, type BadgeVariant } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from '@/components/ui/Table';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';

type Role = 'employee' | 'hr_manager' | 'hr_payroll_user' | 'hr_payroll_manager' | 'admin';

const HR_ROLES: Role[] = ['hr_manager', 'hr_payroll_user', 'hr_payroll_manager', 'admin'];
const STATUS_VARIANT: Record<string, BadgeVariant> = { pending: 'warning', approved: 'success', refused: 'danger' };

interface Employee {
  id: string;
  fullName: string;
}

interface TimeOffRequest {
  id: string;
  employee: { id: string; fullName: string } | null;
  timeOffType: { id: string; name: string; unit: 'days' | 'hours' } | null;
  startDate: string;
  endDate: string;
  duration: string;
  status: 'pending' | 'approved' | 'refused';
}

interface ApiErrorBody {
  error: { code: string; message: string };
}

export default function TimeOffRequestsPage() {
  return (
    <Suspense
      fallback={
        <Container className="flex flex-col gap-3 py-10">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-64 w-full" />
        </Container>
      }
    >
      <TimeOffRequestsPageContent />
    </Suspense>
  );
}

function TimeOffRequestsPageContent() {
  const { user, isLoading: authLoading } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [requests, setRequests] = useState<TimeOffRequest[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [employeeFilter, setEmployeeFilter] = useState(searchParams.get('employeeId') ?? '');
  const [decidingId, setDecidingId] = useState<string | null>(null);

  const isHr = !!user && HR_ROLES.includes(user.role);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: Record<string, string> = {};
      if (employeeFilter) params.employeeId = employeeFilter;

      const [requestsRes, employeesRes] = await Promise.all([
        api.get<{ data: TimeOffRequest[] }>('/time-off-requests', { params }),
        isHr ? api.get<{ data: Employee[] }>('/employees') : Promise.resolve({ data: { data: [] as Employee[] } }),
      ]);
      setRequests(requestsRes.data.data);
      setEmployees(employeesRes.data.data);
    } catch (err) {
      const axiosErr = err as AxiosError<ApiErrorBody>;
      showToast({
        title: 'Failed to load time off requests',
        description: getErrorMessage(axiosErr.response?.data?.error?.code, axiosErr.response?.data?.error?.message),
        variant: 'danger',
      });
    } finally {
      setIsLoading(false);
    }
  }, [employeeFilter, isHr, showToast]);

  useEffect(() => {
    if (user) loadData();
  }, [user, loadData]);

  async function handleDecision(e: React.MouseEvent, id: string, decision: 'approve' | 'refuse') {
    e.stopPropagation();
    setDecidingId(id);
    try {
      await api.post(`/time-off-requests/${id}/${decision}`);
      showToast({ title: decision === 'approve' ? 'Request approved' : 'Request refused', variant: 'success' });
      await loadData();
    } catch (err) {
      const axiosErr = err as AxiosError<ApiErrorBody>;
      showToast({
        title: 'Failed to update request',
        description: getErrorMessage(axiosErr.response?.data?.error?.code, axiosErr.response?.data?.error?.message),
        variant: 'danger',
      });
    } finally {
      setDecidingId(null);
    }
  }

  if (authLoading) return null;

  if (!user) {
    return (
      <Container className="py-10">
        <EmptyState title="Not authorized" description="Sign in to view time off requests." />
      </Container>
    );
  }

  return (
    <Container className="flex flex-col gap-6 py-10">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--text-primary)]">Time Off Requests</h1>
        <p className="text-xs text-[var(--text-tertiary)]">Approval queue</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={() => router.push('/time-off-requests/new')}>+ New Request</Button>
        {isHr && (
          <Select
            placeholder="All employees"
            options={employees.map((e) => ({ value: e.id, label: e.fullName }))}
            value={employeeFilter}
            onChange={(e) => setEmployeeFilter(e.target.value)}
            className="w-56"
          />
        )}
      </div>

      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : requests.length === 0 ? (
        <EmptyState title="No requests yet" description="Create the first time off request to get started." />
      ) : (
        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell>Employee</TableHeaderCell>
              <TableHeaderCell>Type</TableHeaderCell>
              <TableHeaderCell>Start</TableHeaderCell>
              <TableHeaderCell>End</TableHeaderCell>
              <TableHeaderCell>Duration</TableHeaderCell>
              <TableHeaderCell>Status</TableHeaderCell>
              {isHr && <TableHeaderCell>Actions</TableHeaderCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {requests.map((r) => (
              <TableRow key={r.id} className="cursor-pointer" onClick={() => router.push(`/time-off-requests/${r.id}`)}>
                <TableCell className="font-medium">{r.employee?.fullName ?? '—'}</TableCell>
                <TableCell>{r.timeOffType?.name ?? '—'}</TableCell>
                <TableCell>{r.startDate}</TableCell>
                <TableCell>{r.endDate}</TableCell>
                <TableCell className="num">
                  {r.duration} {r.timeOffType?.unit ?? ''}
                </TableCell>
                <TableCell>
                  <Badge variant={STATUS_VARIANT[r.status]} dot>
                    {r.status[0].toUpperCase() + r.status.slice(1)}
                  </Badge>
                </TableCell>
                {isHr && (
                  <TableCell>
                    {r.status === 'pending' && (
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          isLoading={decidingId === r.id}
                          onClick={(e) => handleDecision(e, r.id, 'refuse')}
                        >
                          Refuse
                        </Button>
                        <Button size="sm" isLoading={decidingId === r.id} onClick={(e) => handleDecision(e, r.id, 'approve')}>
                          Approve
                        </Button>
                      </div>
                    )}
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Container>
  );
}
