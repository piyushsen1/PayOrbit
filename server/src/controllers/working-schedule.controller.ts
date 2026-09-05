import { Request, Response, NextFunction } from 'express';
import * as workingScheduleService from '../services/working-schedule.service';

export async function listWorkingSchedulesHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const schedules = await workingScheduleService.listWorkingSchedules();
    res.success(schedules);
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
