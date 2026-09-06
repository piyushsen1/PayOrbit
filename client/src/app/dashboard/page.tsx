'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AxiosError } from 'axios';
import { Bar, BarChart, CartesianGrid, Line, LineChart, XAxis, YAxis, Tooltip } from 'recharts';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';
import { getErrorMessage } from '@/lib/errorMessages';
import { Container } from '@/components/layout/Container';
import { Card, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from '@/components/ui/Table';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { ChartWrapper, CHART_COLORS, chartTheme } from '@/components/charts/ChartWrapper';

type Role = 'employee' | 'hr_manager' | 'hr_payroll_user' | 'hr_payroll_manager' | 'admin';

const DASHBOARD_ROLES: Role[] = ['hr_payroll_user', 'hr_payroll_manager', 'admin'];

type EmployeeType = 'full_time' | 'part_time' | 'contract' | 'intern';

const EMPLOYEE_TYPE_OPTIONS: { value: EmployeeType; label: string }[] = [
  { value: 'full_time', label: 'Full-Time' },
  { value: 'part_time', label: 'Part-Time' },
  { value: 'contract', label: 'Contract' },
  { value: 'intern', label: 'Intern' },
];

interface FilterOptions {
  departments: string[];
  companies: string[];
}

interface DashboardData {
  filter: { periodStart: string; periodEnd: string; department?: string; company?: string; employeeType?: EmployeeType };
  kpis: {
    totalNetSalaryPaid: number;
    averageNetSalary: number;
    payslipsGenerated: number;
    approvedTimeOffDays: number;
    attendanceHealthPct: number | null;
  };
  charts: {
    salaryCostByDepartment: { department: string; total: number }[];
    monthlyNetSalaryTrend: { month: string; payRunName: string; total: number }[];
    payslipStatusBreakdown: { status: string; count: number }[];
  };
  panels: {
    attendanceOverview: {
      present: number;
      late: number;
      absent: number;
      total: number;
      healthPct: number | null;
      totalOvertimeHours: number;
    };
    timeOffOverview: { pending: number; approved: number; refused: number; approvedDays: number };
    departmentOverview: { department: string; employeeCount: number }[];
  };
  warningCount: number;
}

interface ApiErrorBody {
  error: { code: string; message: string };
}

function money(value: number): string {
  return `₹${value.toLocaleString('en-IN')}`;
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <Card className="shadow-glow-xs">
      <CardBody className="flex flex-col gap-1">
        <span className="text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">{label}</span>
        <span className="num text-2xl font-semibold text-[var(--text-primary)]">{value}</span>
      </CardBody>
    </Card>
  );
}

export default function DashboardPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { showToast } = useToast();

  const [filterOptions, setFilterOptions] = useState<FilterOptions>({ departments: [], companies: [] });
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [department, setDepartment] = useState('');
  const [company, setCompany] = useState('');
  const [employeeType, setEmployeeType] = useState('');
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const canAccess = !!user && DASHBOARD_ROLES.includes(user.role);

  const loadFilterOptions = useCallback(async () => {
    try {
      const { data } = await api.get<{ data: FilterOptions }>('/employees/filter-options');
      setFilterOptions(data.data);
    } catch {
      // Filter options are a convenience; a failed fetch just leaves them empty.
    }
  }, []);

  const loadDashboard = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: Record<string, string> = {};
      if (periodStart) params.periodStart = periodStart;
      if (periodEnd) params.periodEnd = periodEnd;
      if (department) params.department = department;
      if (company) params.company = company;
      if (employeeType) params.employeeType = employeeType;
      const { data } = await api.get<{ data: DashboardData }>('/dashboard', { params });
      setData(data.data);
      if (!periodStart) setPeriodStart(data.data.filter.periodStart);
      if (!periodEnd) setPeriodEnd(data.data.filter.periodEnd);
    } catch (err) {
      const axiosErr = err as AxiosError<ApiErrorBody>;
      showToast({
        title: 'Failed to load dashboard',
        description: getErrorMessage(axiosErr.response?.data?.error?.code, axiosErr.response?.data?.error?.message),
        variant: 'danger',
      });
    } finally {
      setIsLoading(false);
    }
  }, [periodStart, periodEnd, department, company, employeeType, showToast]);

  useEffect(() => {
    if (canAccess) {
      loadFilterOptions();
      loadDashboard();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canAccess]);

  const departmentOptions = useMemo(
    () => filterOptions.departments.map((d) => ({ value: d, label: d })),
    [filterOptions.departments],
  );

  const companyOptions = useMemo(
    () => filterOptions.companies.map((c) => ({ value: c, label: c })),
    [filterOptions.companies],
  );

  if (authLoading) return null;

  if (!canAccess) {
    return (
      <Container className="py-10">
        <EmptyState title="Not authorized" description="The Payroll Dashboard is only available to payroll roles." />
      </Container>
    );
  }

  return (
    <Container className="flex flex-col gap-6 py-10">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--text-primary)]">Payroll Dashboard</h1>
        <p className="text-xs text-[var(--text-tertiary)]">Aggregate HR + payroll insight</p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <Input label="Period Start" type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} />
        <Input label="Period End" type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} />
        <Select
          label="Department"
          placeholder="All departments"
          options={departmentOptions}
          value={department}
          onChange={(e) => setDepartment(e.target.value)}
          className="w-48"
        />
        <Select
          label="Company"
          placeholder="All companies"
          options={companyOptions}
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          className="w-48"
        />
        <Select
          label="Employee Type"
          placeholder="All types"
          options={EMPLOYEE_TYPE_OPTIONS}
          value={employeeType}
          onChange={(e) => setEmployeeType(e.target.value)}
          className="w-48"
        />
        <button
          type="button"
          onClick={loadDashboard}
          className="h-10 rounded-xl border border-[var(--border-default)] px-4 text-sm font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface-sunken)]"
        >
          Apply
        </button>
      </div>

      {isLoading || !data ? (
        <Skeleton className="h-96 w-full" />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <StatTile label="Total Net Salary Paid" value={money(data.kpis.totalNetSalaryPaid)} />
            <StatTile label="Average Net Salary" value={money(data.kpis.averageNetSalary)} />
            <StatTile label="Payslips Generated" value={String(data.kpis.payslipsGenerated)} />
            <StatTile label="Approved Time Off Days" value={String(data.kpis.approvedTimeOffDays)} />
            <StatTile
              label="Attendance Health"
              value={data.kpis.attendanceHealthPct !== null ? `${data.kpis.attendanceHealthPct}%` : '—'}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <CardBody className="flex flex-col gap-3">
                <h2 className="text-sm font-semibold text-[var(--text-primary)]">Salary Cost by Department</h2>
                {data.charts.salaryCostByDepartment.length === 0 ? (
                  <EmptyState title="No paid payslips in this period" description="" />
                ) : (
                  <ChartWrapper height={260}>
                    <BarChart data={data.charts.salaryCostByDepartment}>
                      <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} vertical={false} />
                      <XAxis dataKey="department" stroke={chartTheme.axis} tick={{ fill: chartTheme.tick, fontSize: 12 }} />
                      <YAxis stroke={chartTheme.axis} tick={{ fill: chartTheme.tick, fontSize: 12 }} />
                      <Tooltip
                        contentStyle={chartTheme.tooltipContentStyle}
                        labelStyle={chartTheme.tooltipLabelStyle}
                        formatter={(value: number) => money(value)}
                      />
                      <Bar dataKey="total" fill={CHART_COLORS[0]} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ChartWrapper>
                )}
              </CardBody>
            </Card>

            <Card>
              <CardBody className="flex flex-col gap-3">
                <h2 className="text-sm font-semibold text-[var(--text-primary)]">Monthly Net Salary Trend</h2>
                {data.charts.monthlyNetSalaryTrend.length === 0 ? (
                  <EmptyState title="No paid pay runs yet" description="" />
                ) : (
                  <ChartWrapper height={260}>
                    <LineChart data={data.charts.monthlyNetSalaryTrend}>
                      <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} vertical={false} />
                      <XAxis dataKey="month" stroke={chartTheme.axis} tick={{ fill: chartTheme.tick, fontSize: 12 }} />
                      <YAxis stroke={chartTheme.axis} tick={{ fill: chartTheme.tick, fontSize: 12 }} />
                      <Tooltip
                        contentStyle={chartTheme.tooltipContentStyle}
                        labelStyle={chartTheme.tooltipLabelStyle}
                        formatter={(value: number) => money(value)}
                      />
                      <Line type="monotone" dataKey="total" stroke={CHART_COLORS[0]} strokeWidth={2} dot={{ r: 4 }} />
                    </LineChart>
                  </ChartWrapper>
                )}
              </CardBody>
            </Card>
          </div>

          <Card>
            <CardBody className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-[var(--text-primary)]">Payslip Status & Alerts</h2>
                {data.warningCount > 0 && <Badge variant="warning">{data.warningCount} warnings</Badge>}
              </div>
              <div className="flex flex-wrap gap-3">
                {data.charts.payslipStatusBreakdown.map((s) => (
                  <Badge
                    key={s.status}
                    variant={s.status === 'paid' ? 'success' : s.status === 'validated' ? 'info' : 'neutral'}
                    dot
                  >
                    {s.status[0].toUpperCase() + s.status.slice(1)}: {s.count}
                  </Badge>
                ))}
              </div>
            </CardBody>
          </Card>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Card>
              <CardBody className="flex flex-col gap-2">
                <h2 className="text-sm font-semibold text-[var(--text-primary)]">Attendance Overview</h2>
                <p className="text-sm text-[var(--text-secondary)]">Present: {data.panels.attendanceOverview.present}</p>
                <p className="text-sm text-[var(--text-secondary)]">Late: {data.panels.attendanceOverview.late}</p>
                <p className="text-sm text-[var(--text-secondary)]">Absent: {data.panels.attendanceOverview.absent}</p>
                <p className="text-sm text-[var(--text-secondary)]">Total: {data.panels.attendanceOverview.total}</p>
                <p className="text-sm text-[var(--text-secondary)]">
                  Overtime: {data.panels.attendanceOverview.totalOvertimeHours}h
                </p>
              </CardBody>
            </Card>
            <Card>
              <CardBody className="flex flex-col gap-2">
                <h2 className="text-sm font-semibold text-[var(--text-primary)]">Time Off Overview</h2>
                <p className="text-sm text-[var(--text-secondary)]">Pending: {data.panels.timeOffOverview.pending}</p>
                <p className="text-sm text-[var(--text-secondary)]">Approved: {data.panels.timeOffOverview.approved}</p>
                <p className="text-sm text-[var(--text-secondary)]">Refused: {data.panels.timeOffOverview.refused}</p>
                <p className="text-sm text-[var(--text-secondary)]">Approved Days: {data.panels.timeOffOverview.approvedDays}</p>
              </CardBody>
            </Card>
            <Card>
              <CardBody className="flex flex-col gap-2">
                <h2 className="text-sm font-semibold text-[var(--text-primary)]">Department Overview</h2>
                {data.panels.departmentOverview.length === 0 ? (
                  <p className="text-sm text-[var(--text-tertiary)]">No employees in scope.</p>
                ) : (
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableHeaderCell>Department</TableHeaderCell>
                        <TableHeaderCell>Employees</TableHeaderCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {data.panels.departmentOverview.map((d) => (
                        <TableRow key={d.department}>
                          <TableCell>{d.department}</TableCell>
                          <TableCell className="num">{d.employeeCount}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardBody>
            </Card>
          </div>
        </>
      )}
    </Container>
  );
}
