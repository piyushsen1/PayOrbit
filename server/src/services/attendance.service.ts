import { AppDataSource } from '../config/data-source';
import { Attendance, AttendanceStatus } from '../entities/Attendance';
import { Employee } from '../entities/Employee';
import { DayOfWeek, WorkingScheduleDay } from '../entities/WorkingScheduleDay';
import { AppError } from '../utils/AppError';
import { ErrorCodes } from '../utils/error-codes';

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

/** Worked hours from check-in/out, and overtime against the employee's Working Schedule for that day — both derived, never stored. */
async function withWorkedHoursAndOvertime(attendance: Attendance, employee?: Employee | null) {
  let workedHours = 0;
  if (attendance.checkIn && attendance.checkOut) {
    workedHours = (attendance.checkOut.getTime() - attendance.checkIn.getTime()) / 3_600_000;
  }

  let expectedHours: number | null = null;
  const workingScheduleId = employee?.workingScheduleId;
  if (workingScheduleId) {
    const scheduleDay = await workingScheduleDayRepository().findOne({
      where: { workingScheduleId, dayOfWeek: dayOfWeekFor(attendance.date) },
    });
    if (scheduleDay) {
      const [startH, startM] = scheduleDay.startTime.split(':').map(Number);
      const [endH, endM] = scheduleDay.endTime.split(':').map(Number);
      expectedHours = Math.max(endH * 60 + endM - (startH * 60 + startM) - scheduleDay.breakMinutes, 0) / 60;
    }
  }

  const overtime = expectedHours != null ? Math.max(workedHours - expectedHours, 0) : 0;

  return {
    ...attendance,
    workedHours: Number(workedHours.toFixed(2)),
    overtime: Number(overtime.toFixed(2)),
  };
}

export interface AttendanceInput {
  employeeId: string;
  date: string;
  checkIn?: string | null;
  checkOut?: string | null;
  status?: AttendanceStatus;
  notes?: string | null;
}

export async function listAttendance(filter?: { employeeId?: string; date?: string }) {
  const records = await attendanceRepository().find({
    where: {
      ...(filter?.employeeId ? { employeeId: filter.employeeId } : {}),
      ...(filter?.date ? { date: filter.date } : {}),
    },
    relations: ['employee'],
    order: { date: 'DESC' },
  });
  return Promise.all(records.map((r) => withWorkedHoursAndOvertime(r, r.employee)));
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
    record = repo.create({ employeeId, date, status: AttendanceStatus.PRESENT });
  }
  record.checkIn = new Date();
  record.status = AttendanceStatus.PRESENT;
  const saved = await repo.save(record);

  const employee = await employeeRepository().findOne({ where: { id: employeeId } });
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
