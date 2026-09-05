import { AppDataSource } from '../config/data-source';
import { Attendance, AttendanceStatus } from '../entities/Attendance';
import { Employee } from '../entities/Employee';
import { DayOfWeek, WorkingScheduleDay } from '../entities/WorkingScheduleDay';
import { AppError } from '../utils/AppError';
import { ErrorCodes } from '../utils/error-codes';
import { parsePagination, buildPaginationMeta, type PaginationParams } from '../utils/pagination';

const attendanceRepository = () => AppDataSource.getRepository(Attendance);
const employeeRepository = () => AppDataSource.getRepository(Employee);
const workingScheduleDayRepository = () => AppDataSource.getRepository(WorkingScheduleDay);

const DAYS_OF_WEEK = [
  DayOfWeek.SUNDAY,
  DayOfWeek.MONDAY,
  DayOfWeek.TUESDAY,
  DayOfWeek.WEDNESDAY,
  DayOfWeek.THURSDAY,
  DayOfWeek.FRIDAY,
  DayOfWeek.SATURDAY,
];

function dayOfWeekFor(date: string): DayOfWeek {
  const [year, month, day] = date.split('-').map(Number);
  return DAYS_OF_WEEK[new Date(Date.UTC(year, month - 1, day)).getUTCDay()];
}

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

/** How many minutes late a check-in is allowed to be before it's flagged `late` instead of `present`. */
const LATE_GRACE_MINUTES = 15;

async function getScheduledDay(employee: Employee | null | undefined, date: string) {
  const workingScheduleId = employee?.workingScheduleId;
  if (!workingScheduleId) return null;
  return workingScheduleDayRepository().findOne({
    where: { workingScheduleId, dayOfWeek: dayOfWeekFor(date) },
  });
}

/** Worked hours from check-in/out, and overtime against the employee's Working Schedule for that day — both derived, never stored. */
async function withWorkedHoursAndOvertime(attendance: Attendance, employee?: Employee | null) {
  let workedHours = 0;
  if (attendance.checkIn && attendance.checkOut) {
    workedHours = (attendance.checkOut.getTime() - attendance.checkIn.getTime()) / 3_600_000;
  }

  let expectedHours: number | null = null;
  const scheduleDay = await getScheduledDay(employee, attendance.date);
  if (scheduleDay) {
    const [startH, startM] = scheduleDay.startTime.split(':').map(Number);
    const [endH, endM] = scheduleDay.endTime.split(':').map(Number);
    expectedHours = Math.max(endH * 60 + endM - (startH * 60 + startM) - scheduleDay.breakMinutes, 0) / 60;
  }

  const overtime = expectedHours != null ? Math.max(workedHours - expectedHours, 0) : 0;

  return {
    ...attendance,
    workedHours: Number(workedHours.toFixed(2)),
    overtime: Number(overtime.toFixed(2)),
  };
}

/** True if `checkInTime` is more than LATE_GRACE_MINUTES after the scheduled start for that day (UTC time-of-day compare). */
function isLateCheckIn(checkInTime: Date, scheduleDay: WorkingScheduleDay): boolean {
  const [startH, startM] = scheduleDay.startTime.split(':').map(Number);
  const scheduledMinutes = startH * 60 + startM;
  const actualMinutes = checkInTime.getUTCHours() * 60 + checkInTime.getUTCMinutes();
  return actualMinutes > scheduledMinutes + LATE_GRACE_MINUTES;
}

export interface AttendanceInput {
  employeeId: string;
  date: string;
  checkIn?: string | null;
  checkOut?: string | null;
  status?: AttendanceStatus;
  notes?: string | null;
}

/** Aggregate present/late/absent counts and total overtime hours for a date range (and optional employee scope) — used by the Payroll Dashboard's attendance panel. */
export async function getOvertimeRollup(filter: { periodStart: string; periodEnd: string; employeeIds?: string[] }) {
  const qb = attendanceRepository()
    .createQueryBuilder('attendance')
    .where('attendance.date BETWEEN :periodStart AND :periodEnd', {
      periodStart: filter.periodStart,
      periodEnd: filter.periodEnd,
    });
  if (filter.employeeIds) qb.andWhere('attendance.employee_id IN (:...employeeIds)', { employeeIds: filter.employeeIds });
  qb.leftJoinAndSelect('attendance.employee', 'employee');

  const records = await qb.getMany();
  const withOvertime = await Promise.all(records.map((r) => withWorkedHoursAndOvertime(r, r.employee)));

  return {
    present: records.filter((r) => r.status === AttendanceStatus.PRESENT).length,
    late: records.filter((r) => r.status === AttendanceStatus.LATE).length,
    absent: records.filter((r) => r.status === AttendanceStatus.ABSENT).length,
    total: records.length,
    totalOvertimeHours: Number(withOvertime.reduce((sum, r) => sum + r.overtime, 0).toFixed(2)),
  };
}

export async function listAttendance(
  filter?: { employeeId?: string; date?: string },
  pagination: PaginationParams = parsePagination({})
) {
  const [records, total] = await attendanceRepository().findAndCount({
    where: {
      ...(filter?.employeeId ? { employeeId: filter.employeeId } : {}),
      ...(filter?.date ? { date: filter.date } : {}),
    },
    relations: ['employee'],
    order: { date: 'DESC' },
    skip: pagination.skip,
    take: pagination.take,
  });
  const items = await Promise.all(records.map((r) => withWorkedHoursAndOvertime(r, r.employee)));
  return { items, meta: buildPaginationMeta(pagination, total) };
}

export async function getAttendance(id: string) {
  const record = await attendanceRepository().findOne({ where: { id }, relations: ['employee'] });
  if (!record) {
    throw new AppError(ErrorCodes.NOT_FOUND, 'Attendance record not found.', 404);
  }
  return withWorkedHoursAndOvertime(record, record.employee);
}

export async function createAttendance(input: AttendanceInput) {
  const employee = await employeeRepository().findOne({ where: { id: input.employeeId } });
  if (!employee) {
    throw new AppError(ErrorCodes.NOT_FOUND, 'Selected employee does not exist.', 404);
  }

  const repo = attendanceRepository();
  const record = repo.create({
    employeeId: input.employeeId,
    date: input.date,
    checkIn: input.checkIn ? new Date(input.checkIn) : null,
    checkOut: input.checkOut ? new Date(input.checkOut) : null,
    status: input.status ?? AttendanceStatus.PRESENT,
    notes: input.notes ?? null,
  });
  const saved = await repo.save(record);
  return withWorkedHoursAndOvertime(saved, employee);
}

export async function updateAttendance(id: string, input: Partial<Omit<AttendanceInput, 'employeeId'>>) {
  const repo = attendanceRepository();
  const record = await repo.findOne({ where: { id }, relations: ['employee'] });
  if (!record) {
    throw new AppError(ErrorCodes.NOT_FOUND, 'Attendance record not found.', 404);
  }

  if (input.date !== undefined) record.date = input.date;
  if (input.checkIn !== undefined) record.checkIn = input.checkIn ? new Date(input.checkIn) : null;
  if (input.checkOut !== undefined) record.checkOut = input.checkOut ? new Date(input.checkOut) : null;
  if (input.status !== undefined) record.status = input.status;
  if (input.notes !== undefined) record.notes = input.notes;

  const saved = await repo.save(record);
  return withWorkedHoursAndOvertime(saved, record.employee);
}

export async function deleteAttendance(id: string) {
  const repo = attendanceRepository();
  const result = await repo.delete(id);
  if (!result.affected) {
    throw new AppError(ErrorCodes.NOT_FOUND, 'Attendance record not found.', 404);
  }
}

/** The caller's own attendance record for today, or null if they haven't checked in yet — lets the self-service widget know its real state on load instead of assuming "not checked in". */
export async function getTodayAttendance(employeeId: string) {
  const date = todayIsoDate();
  const record = await attendanceRepository().findOne({ where: { employeeId, date } });
  if (!record) return null;
  const employee = await employeeRepository().findOne({ where: { id: employeeId } });
  return withWorkedHoursAndOvertime(record, employee);
}

export async function checkIn(employeeId: string) {
  const repo = attendanceRepository();
  const date = todayIsoDate();
  let record = await repo.findOne({ where: { employeeId, date } });

  if (record?.checkIn && !record.checkOut) {
    throw new AppError(ErrorCodes.VALIDATION_ERROR, 'Already checked in for today.', 422);
  }
  if (record?.checkOut) {
    throw new AppError(ErrorCodes.VALIDATION_ERROR, 'Already checked out for today.', 422);
  }

  if (!record) {
    record = repo.create({ employeeId, date });
  }
  const employee = await employeeRepository().findOne({ where: { id: employeeId } });
  const checkInTime = new Date();
  const scheduleDay = await getScheduledDay(employee, date);

  record.checkIn = checkInTime;
  record.status = scheduleDay && isLateCheckIn(checkInTime, scheduleDay) ? AttendanceStatus.LATE : AttendanceStatus.PRESENT;
  const saved = await repo.save(record);

  return withWorkedHoursAndOvertime(saved, employee);
}

export async function checkOut(employeeId: string) {
  const repo = attendanceRepository();
  const date = todayIsoDate();
  const record = await repo.findOne({ where: { employeeId, date } });

  if (!record || !record.checkIn) {
    throw new AppError(ErrorCodes.VALIDATION_ERROR, 'Not checked in for today.', 422);
  }
  if (record.checkOut) {
    throw new AppError(ErrorCodes.VALIDATION_ERROR, 'Already checked out for today.', 422);
  }

  record.checkOut = new Date();
  const saved = await repo.save(record);

  const employee = await employeeRepository().findOne({ where: { id: employeeId } });
  return withWorkedHoursAndOvertime(saved, employee);
}
