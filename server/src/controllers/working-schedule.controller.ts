import { Request, Response, NextFunction } from 'express';
import * as workingScheduleService from '../services/working-schedule.service';
import { WorkingScheduleStatus } from '../entities/WorkingSchedule';
import { parsePagination } from '../utils/pagination';

export async function listWorkingSchedulesHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const search = typeof req.query.search === 'string' ? req.query.search : undefined;
    const status =
      typeof req.query.status === 'string' ? (req.query.status as WorkingScheduleStatus) : undefined;
    const pagination = parsePagination(req.query as { page?: number; limit?: number });
    const { items, meta } = await workingScheduleService.listWorkingSchedules({ search, status }, pagination);
    res.success(items, 200, meta);
  } catch (err) {
    next(err);
  }
}

export async function getWorkingScheduleHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const schedule = await workingScheduleService.getWorkingSchedule(req.params.id);
    res.success(schedule);
  } catch (err) {
    next(err);
  }
}

export async function createWorkingScheduleHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const schedule = await workingScheduleService.createWorkingSchedule(req.body);
    res.success(schedule, 201);
  } catch (err) {
    next(err);
  }
}

export async function updateWorkingScheduleHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const schedule = await workingScheduleService.updateWorkingSchedule(req.params.id, req.body);
    res.success(schedule);
  } catch (err) {
    next(err);
  }
}

export async function deleteWorkingScheduleHandler(req: Request, res: Response, next: NextFunction) {
  try {
    await workingScheduleService.deleteWorkingSchedule(req.params.id);
    res.success(null);
  } catch (err) {
    next(err);
  }
}
