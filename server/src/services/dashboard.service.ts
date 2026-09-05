import { AppDataSource } from '../config/data-source';
import { Employee } from '../entities/Employee';
import { Attendance, AttendanceStatus } from '../entities/Attendance';
import { TimeOffRequest, TimeOffRequestStatus } from '../entities/TimeOffRequest';
import { Payslip, PayslipStatus } from '../entities/Payslip';
import { PayRun } from '../entities/PayRun';

const employeeRepository = () => AppDataSource.getRepository(Employee);
const attendanceRepository = () => AppDataSource.getRepository(Attendance);
const timeOffRequestRepository = () => AppDataSource.getRepository(TimeOffRequest);
const payslipRepository = () => AppDataSource.getRepository(Payslip);
const payRunRepository = () => AppDataSource.getRepository(PayRun);

export interface DashboardFilter {
  periodStart: string;
  periodEnd: string;
  department?: string;
  company?: string;
}

/** Employee ids matching the department/company filters, or undefined if neither filter is set (meaning "no restriction"). */
async function filteredEmployeeIds(filter: DashboardFilter): Promise<string[] | undefined> {
  if (!filter.department && !filter.company) return undefined;
  const qb = employeeRepository().createQueryBuilder('employee').select('employee.id', 'id');
  if (filter.department) qb.andWhere('employee.department = :department', { department: filter.department });
  if (filter.company) qb.andWhere('employee.company = :company', { company: filter.company });
  const rows = await qb.getRawMany<{ id: string }>();
  return rows.map((r) => r.id);
}

export async function getDashboard(filter: DashboardFilter) {
  const employeeIds = await filteredEmployeeIds(filter);

  // -- Payroll KPIs --
  const payslipQb = payslipRepository()
    .createQueryBuilder('payslip')
    .innerJoin('payslip.payRun', 'payRun')
    .where('payRun.period_start <= :periodEnd', { periodEnd: filter.periodEnd })
    .andWhere('payRun.period_end >= :periodStart', { periodStart: filter.periodStart });
  if (employeeIds) payslipQb.andWhere('payslip.employee_id IN (:...employeeIds)', { employeeIds });

  const payslipsInPeriod = await payslipQb.getMany();
  const paidPayslips = payslipsInPeriod.filter((p) => p.status === PayslipStatus.PAID);
  const totalNetSalaryPaid = paidPayslips.reduce((sum, p) => sum + Number(p.netTotal ?? 0), 0);
  const payslipsGenerated = payslipsInPeriod.length;

  const payslipStatusBreakdown = [PayslipStatus.DRAFT, PayslipStatus.VALIDATED, PayslipStatus.PAID].map((status) => ({
    status,
    count: payslipsInPeriod.filter((p) => p.status === status).length,
  }));
  const warningCount = payslipsInPeriod.filter((p) => !!p.warning).length;

  // -- Salary cost by department (paid payslips in period, grouped by the employee's current department) --
  const employees = await employeeRepository().find();
  const employeeById = new Map(employees.map((e) => [e.id, e]));
  const salaryCostByDepartmentMap = new Map<string, number>();
  for (const payslip of paidPayslips) {
    const department = employeeById.get(payslip.employeeId)?.department ?? 'Unassigned';
    salaryCostByDepartmentMap.set(department, (salaryCostByDepartmentMap.get(department) ?? 0) + Number(payslip.netTotal ?? 0));
  }
  const salaryCostByDepartment = Array.from(salaryCostByDepartmentMap.entries()).map(([department, total]) => ({
    department,
    total: Number(total.toFixed(2)),
  }));

  // -- Monthly net salary trend: paid pay runs, grouped by period month, regardless of the period filter (last 12 pay runs) --
  const paidPayRuns = await payRunRepository().find({
    where: { status: 'paid' as PayRun['status'] },
    relations: ['payslips'],
    order: { periodStart: 'ASC' },
  });
  const monthlyNetSalaryTrend = paidPayRuns
    .filter((run) => !employeeIds || run.payslips.some((p) => employeeIds.includes(p.employeeId)))
    .map((run) => ({
      month: run.periodStart.slice(0, 7),
      payRunName: run.name,
      total: Number(
        run.payslips
          .filter((p) => !employeeIds || employeeIds.includes(p.employeeId))
          .reduce((sum, p) => sum + Number(p.netTotal ?? 0), 0)
          .toFixed(2)
      ),
    }));

  // -- Time off overview (requests overlapping the period) --
  const timeOffQb = timeOffRequestRepository()
    .createQueryBuilder('request')
    .where('request.start_date <= :periodEnd', { periodEnd: filter.periodEnd })
    .andWhere('request.end_date >= :periodStart', { periodStart: filter.periodStart });
  if (employeeIds) timeOffQb.andWhere('request.employee_id IN (:...employeeIds)', { employeeIds });
  const timeOffRequests = await timeOffQb.getMany();
  const approvedTimeOffDays = timeOffRequests
    .filter((r) => r.status === TimeOffRequestStatus.APPROVED)
    .reduce((sum, r) => sum + Number(r.duration), 0);
  const timeOffOverview = {
    pending: timeOffRequests.filter((r) => r.status === TimeOffRequestStatus.PENDING).length,
    approved: timeOffRequests.filter((r) => r.status === TimeOffRequestStatus.APPROVED).length,
    refused: timeOffRequests.filter((r) => r.status === TimeOffRequestStatus.REFUSED).length,
    approvedDays: Number(approvedTimeOffDays.toFixed(2)),
  };

  // -- Attendance overview (records within the period) --
  const attendanceQb = attendanceRepository()
    .createQueryBuilder('attendance')
    .where('attendance.date BETWEEN :periodStart AND :periodEnd', {
      periodStart: filter.periodStart,
      periodEnd: filter.periodEnd,
    });
  if (employeeIds) attendanceQb.andWhere('attendance.employee_id IN (:...employeeIds)', { employeeIds });
  const attendanceRecords = await attendanceQb.getMany();
  const presentCount = attendanceRecords.filter((a) => a.status === AttendanceStatus.PRESENT).length;
  const absentCount = attendanceRecords.filter((a) => a.status === AttendanceStatus.ABSENT).length;
  const attendanceOverview = {
    present: presentCount,
    absent: absentCount,
    total: attendanceRecords.length,
    healthPct: attendanceRecords.length ? Number(((presentCount / attendanceRecords.length) * 100).toFixed(1)) : null,
  };

  // -- Department overview (headcount, respecting the department/company filter) --
  const scopedEmployees = employeeIds ? employees.filter((e) => employeeIds.includes(e.id)) : employees;
  const departmentOverviewMap = new Map<string, number>();
  for (const employee of scopedEmployees) {
    const department = employee.department ?? 'Unassigned';
    departmentOverviewMap.set(department, (departmentOverviewMap.get(department) ?? 0) + 1);
  }
  const departmentOverview = Array.from(departmentOverviewMap.entries()).map(([department, employeeCount]) => ({
    department,
    employeeCount,
  }));

  return {
    filter,
    kpis: {
      totalNetSalaryPaid: Number(totalNetSalaryPaid.toFixed(2)),
      payslipsGenerated,
      approvedTimeOffDays: timeOffOverview.approvedDays,
      attendanceHealthPct: attendanceOverview.healthPct,
    },
    charts: {
      salaryCostByDepartment,
      monthlyNetSalaryTrend,
      payslipStatusBreakdown,
    },
    panels: {
      attendanceOverview,
      timeOffOverview,
      departmentOverview,
    },
    warningCount,
  };
}
