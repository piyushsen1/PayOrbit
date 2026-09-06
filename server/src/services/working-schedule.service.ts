import { ILike } from 'typeorm';
import { AppDataSource } from '../config/data-source';
import { WorkingSchedule, WorkingScheduleStatus } from '../entities/WorkingSchedule';
import { DayOfWeek, WorkingScheduleDay } from '../entities/WorkingScheduleDay';
import { AppError } from '../utils/AppError';
import { ErrorCodes } from '../utils/error-codes';
import { parsePagination, buildPaginationMeta, type PaginationParams } from '../utils/pagination';

const workingScheduleRepository = () => AppDataSource.getRepository(WorkingSchedule);
const workingScheduleDayRepository = () => AppDataSource.getRepository(WorkingScheduleDay);

export interface WorkingScheduleDayInput {
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
  breakMinutes?: number;
}

/** Sum of (end - start - break) across a schedule's days, in hours, rounded to 2dp. */
function computeWeeklyHours(days: WorkingScheduleDayInput[]): string {
  const totalMinutes = days.reduce((sum, day) => {
    const [startH, startM] = day.startTime.split(':').map(Number);
    const [endH, endM] = day.endTime.split(':').map(Number);
    const minutes = endH * 60 + endM - (startH * 60 + startM) - (day.breakMinutes ?? 0);
    return sum + Math.max(minutes, 0);
  }, 0);
  return (totalMinutes / 60).toFixed(2);
}

export async function listWorkingSchedules(
  filter?: { search?: string; status?: WorkingScheduleStatus },
  pagination: PaginationParams = parsePagination({})
) {
  const where: Record<string, unknown> = {};
  if (filter?.search) where.name = ILike(`%${filter.search}%`);
  if (filter?.status) where.status = filter.status;

  const [schedules, total] = await workingScheduleRepository().findAndCount({
    where,
    relations: ['days'],
    order: { name: 'ASC' },
    skip: pagination.skip,
    take: pagination.take,
  });
  const items = schedules.map((schedule) => ({ ...schedule, daysPerWeek: schedule.days.length }));
  return { items, meta: buildPaginationMeta(pagination, total) };
}

export async function getWorkingSchedule(id: string) {
  const schedule = await workingScheduleRepository().findOne({ where: { id }, relations: ['days'] });
  if (!schedule) {
    throw new AppError(ErrorCodes.NOT_FOUND, 'Working schedule not found.', 404);
  }
  return { ...schedule, daysPerWeek: schedule.days.length };
}

export async function createWorkingSchedule(input: {
  name: string;
  company: string;
  timezone?: string;
  status?: WorkingScheduleStatus;
  days: WorkingScheduleDayInput[];
}) {
  const repo = workingScheduleRepository();
  const schedule = repo.create({
    name: input.name,
    company: input.company,
    timezone: input.timezone ?? 'UTC',
    status: input.status ?? WorkingScheduleStatus.ACTIVE,
    weeklyHours: computeWeeklyHours(input.days),
    days: input.days.map((day) => Object.assign(new WorkingScheduleDay(), day)),
  });
  const saved = await repo.save(schedule);
  return { ...saved, daysPerWeek: saved.days.length };
}

export async function updateWorkingSchedule(
  id: string,
  input: {
    name?: string;
    company?: string;
    timezone?: string;
    status?: WorkingScheduleStatus;
    days?: WorkingScheduleDayInput[];
  }
) {
  const repo = workingScheduleRepository();
  const schedule = await repo.findOne({ where: { id } });
  if (!schedule) {
    throw new AppError(ErrorCodes.NOT_FOUND, 'Working schedule not found.', 404);
  }

  if (input.name) schedule.name = input.name;
  if (input.company) schedule.company = input.company;
  if (input.timezone) schedule.timezone = input.timezone;
  if (input.status) schedule.status = input.status;
  if (input.days) schedule.weeklyHours = computeWeeklyHours(input.days);
  await repo.save(schedule);

  if (input.days) {
    // Replacing the full weekly pattern: drop the old days and insert the new set,
    // rather than relying on TypeORM's relation-cascade to reconcile the diff.
    const dayRepo = workingScheduleDayRepository();
    await dayRepo.delete({ workingScheduleId: id });
    await dayRepo.save(input.days.map((day) => dayRepo.create({ ...day, workingScheduleId: id })));
  }

  const updated = await repo.findOne({ where: { id }, relations: ['days'] });
  return { ...updated!, daysPerWeek: updated!.days.length };
}

export async function deleteWorkingSchedule(id: string) {
  const repo = workingScheduleRepository();
  const result = await repo.delete(id);
  if (!result.affected) {
    throw new AppError(ErrorCodes.NOT_FOUND, 'Working schedule not found.', 404);
  }
}
