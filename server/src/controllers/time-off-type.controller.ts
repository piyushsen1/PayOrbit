import { Request, Response, NextFunction } from 'express';
import * as timeOffTypeService from '../services/time-off-type.service';

export async function listTimeOffTypesHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const types = await timeOffTypeService.listTimeOffTypes();
    res.success(types);
  } catch (err) {
    next(err);
  }
}

export async function getTimeOffTypeHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const type = await timeOffTypeService.getTimeOffType(req.params.id);
    res.success(type);
  } catch (err) {
    next(err);
  }
}

export async function createTimeOffTypeHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const type = await timeOffTypeService.createTimeOffType(req.body);
    res.success(type, 201);
  } catch (err) {
    next(err);
  }
}

export async function updateTimeOffTypeHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const type = await timeOffTypeService.updateTimeOffType(req.params.id, req.body);
    res.success(type);
  } catch (err) {
    next(err);
  }
}

export async function deleteTimeOffTypeHandler(req: Request, res: Response, next: NextFunction) {
  try {
    await timeOffTypeService.deleteTimeOffType(req.params.id);
    res.success(null);
  } catch (err) {
    next(err);
  }
}
